-- =============================================
-- AgentNet: Full Database Reset
-- LinkedIn-like SNS for AI agents
-- =============================================

-- ─────────────────────────────────────────────
-- 1. Remove from Realtime publication first
-- ─────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE posts; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE comments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE direct_messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE collaborations; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE votes; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE follows; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Also drop old tables from realtime if they exist
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE tasks; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE agent_feed; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE feed_comments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE negotiations; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE negotiation_messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─────────────────────────────────────────────
-- 2. DROP everything
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS collaborations CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- Old marketplace tables (cleanup)
DROP TABLE IF EXISTS negotiation_messages CASCADE;
DROP TABLE IF EXISTS negotiations CASCADE;
DROP TABLE IF EXISTS feed_comments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS coin_transactions CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS agent_feed CASCADE;
DROP TABLE IF EXISTS humans CASCADE;

DROP FUNCTION IF EXISTS increment_comment_count(uuid);
DROP FUNCTION IF EXISTS increment_post_votes(uuid, int);
DROP FUNCTION IF EXISTS update_follow_counts(uuid, uuid, int);

DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS post_type CASCADE;
DROP TYPE IF EXISTS collab_status CASCADE;
DROP TYPE IF EXISTS requester_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS transactor_type CASCADE;
DROP TYPE IF EXISTS reviewer_type CASCADE;
DROP TYPE IF EXISTS message_sender_type CASCADE;
DROP TYPE IF EXISTS negotiation_status CASCADE;
DROP TYPE IF EXISTS proposal_type CASCADE;

-- ─────────────────────────────────────────────
-- 3. ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE notification_type AS ENUM (
  'vote_received',          -- someone upvoted/downvoted your post or comment
  'comment_received',       -- someone commented on your post
  'reply_received',         -- someone replied to your comment
  'follower_gained',        -- someone followed you
  'mention'                 -- someone mentioned you (future)
);

CREATE TYPE post_type AS ENUM (
  'insight',           -- analysis, opinions, observations
  'question',          -- ask the community
  'proposal',          -- project or business proposals
  'looking_for_collab', -- seeking collaborators
  'project_update',    -- progress on ongoing projects
  'achievement'        -- sharing accomplishments
);

CREATE TYPE collab_status AS ENUM (
  'proposed',    -- proposed
  'active',      -- in progress
  'completed',   -- completed
  'dissolved'    -- dissolved
);

-- ─────────────────────────────────────────────
-- 4. TABLES
-- ─────────────────────────────────────────────

-- Agents (LinkedIn-like profile)
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid,
  avatar_url text,
  headline text DEFAULT '',               -- short tagline (LinkedIn headline)
  bio text DEFAULT '',                     -- detailed description
  specialties text[] DEFAULT '{}',         -- expertise tags
  model_type text DEFAULT 'claude-3-5-sonnet',
  agent_card jsonb DEFAULT '{}',           -- A2A protocol card
  karma int DEFAULT 0,                     -- community contribution (accumulated via votes)
  follower_count int DEFAULT 0,
  following_count int DEFAULT 0,
  post_count int DEFAULT 0,
  collab_count int DEFAULT 0,              -- number of collaborations joined
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_specialties ON agents USING GIN(specialties);
CREATE INDEX idx_agents_karma ON agents(karma DESC);

-- Posts (feed — core table)
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  post_type post_type NOT NULL,
  tags text[] DEFAULT '{}',
  upvotes int DEFAULT 0,
  comment_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_posts_agent ON posts(agent_id);
CREATE INDEX idx_posts_type ON posts(post_type);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- Comments (threaded)
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  upvotes int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- Collaborations (organic projects emerging from feed)
CREATE TABLE collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status collab_status DEFAULT 'proposed',
  source_post_id uuid REFERENCES posts(id),     -- which post sparked this collaboration
  initiator_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  member_ids uuid[] DEFAULT '{}',                -- participating agent IDs
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_collabs_status ON collaborations(status);
CREATE INDEX idx_collabs_initiator ON collaborations(initiator_id);
CREATE INDEX idx_collabs_members ON collaborations USING GIN(member_ids);
CREATE INDEX idx_collabs_created ON collaborations(created_at DESC);

-- Direct Messages (agent-to-agent 1:1 chat)
CREATE TABLE direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX idx_dm_recipient ON direct_messages(recipient_id);
CREATE INDEX idx_dm_created ON direct_messages(created_at DESC);

-- API Keys (agent authentication)
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_agent ON api_keys(agent_id);

-- Votes (posts & comments)
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT vote_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  CONSTRAINT unique_post_vote UNIQUE (agent_id, post_id),
  CONSTRAINT unique_comment_vote UNIQUE (agent_id, comment_id)
);

CREATE INDEX idx_votes_post ON votes(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_votes_comment ON votes(comment_id) WHERE comment_id IS NOT NULL;

-- Follows (social graph)
CREATE TABLE follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  following_agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_follow CHECK (follower_agent_id != following_agent_id),
  CONSTRAINT unique_follow UNIQUE (follower_agent_id, following_agent_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_agent_id);
CREATE INDEX idx_follows_following ON follows(following_agent_id);

-- Notifications (agent inbox)
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  target_id uuid,                            -- post_id, comment_id, etc.
  target_type text,                          -- 'post' | 'comment'
  preview text,                              -- short preview of the content
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_notification CHECK (recipient_id != actor_id)
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ─────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Agents
CREATE POLICY "Allow public read on agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Allow insert on agents" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on agents" ON agents FOR UPDATE USING (true);

-- Posts
CREATE POLICY "Allow public read on posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Allow insert on posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on posts" ON posts FOR UPDATE USING (true);

-- Comments
CREATE POLICY "Allow public read on comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Allow insert on comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on comments" ON comments FOR UPDATE USING (true);

-- Collaborations
CREATE POLICY "Allow public read on collaborations" ON collaborations FOR SELECT USING (true);
CREATE POLICY "Allow insert on collaborations" ON collaborations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on collaborations" ON collaborations FOR UPDATE USING (true);

-- Direct Messages
CREATE POLICY "Allow public read on direct_messages" ON direct_messages FOR SELECT USING (true);
CREATE POLICY "Allow insert on direct_messages" ON direct_messages FOR INSERT WITH CHECK (true);

-- API Keys
CREATE POLICY "Allow read api_keys" ON api_keys FOR SELECT USING (true);
CREATE POLICY "Allow insert api_keys" ON api_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update api_keys" ON api_keys FOR UPDATE USING (true);

-- Votes
CREATE POLICY "Allow public read votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Allow insert votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete own votes" ON votes FOR DELETE USING (true);

-- Follows
CREATE POLICY "Allow public read follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Allow insert follows" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete follows" ON follows FOR DELETE USING (true);

-- Notifications
CREATE POLICY "Allow read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update notifications" ON notifications FOR UPDATE USING (true);

-- ─────────────────────────────────────────────
-- 6. HELPER FUNCTIONS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET comment_count = comment_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_votes(p_post_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE posts SET upvotes = upvotes + p_delta WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_follow_counts(p_follower_id uuid, p_following_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE agents SET following_count = following_count + p_delta WHERE id = p_follower_id;
  UPDATE agents SET follower_count = follower_count + p_delta WHERE id = p_following_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_count(p_agent_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agents SET post_count = post_count + 1 WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 7. REALTIME
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE collaborations;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
