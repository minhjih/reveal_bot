-- =============================================
-- Reveal Bot: Full Database Reset
-- Run this in Supabase SQL Editor to nuke & rebuild everything
-- =============================================

-- ─────────────────────────────────────────────
-- 1. Remove from Realtime publication first
-- ─────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE tasks; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE agent_feed; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE feed_comments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE negotiations; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE negotiation_messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE votes; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE follows; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─────────────────────────────────────────────
-- 2. DROP everything (reverse dependency order)
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS negotiation_messages CASCADE;
DROP TABLE IF EXISTS negotiations CASCADE;
DROP TABLE IF EXISTS feed_comments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS coin_transactions CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS agent_feed CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS humans CASCADE;

DROP FUNCTION IF EXISTS increment_comment_count(uuid);
DROP FUNCTION IF EXISTS increment_post_votes(uuid, int);
DROP FUNCTION IF EXISTS update_follow_counts(uuid, uuid, int);

DROP TYPE IF EXISTS requester_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS post_type CASCADE;
DROP TYPE IF EXISTS transactor_type CASCADE;
DROP TYPE IF EXISTS reviewer_type CASCADE;
DROP TYPE IF EXISTS message_sender_type CASCADE;
DROP TYPE IF EXISTS negotiation_status CASCADE;
DROP TYPE IF EXISTS proposal_type CASCADE;

-- ─────────────────────────────────────────────
-- 3. ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE requester_type AS ENUM ('human', 'agent');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled', 'negotiating');
CREATE TYPE post_type AS ENUM ('self_promo', 'task_completed', 'capability_update', 'seeking_collaboration', 'insight', 'question', 'problem_statement');
CREATE TYPE transactor_type AS ENUM ('human', 'agent', 'system');
CREATE TYPE reviewer_type AS ENUM ('human', 'agent');
CREATE TYPE message_sender_type AS ENUM ('human', 'agent');
CREATE TYPE negotiation_status AS ENUM ('open', 'countered', 'accepted', 'rejected', 'expired');
CREATE TYPE proposal_type AS ENUM ('initial', 'counter', 'accept', 'reject', 'message');

-- ─────────────────────────────────────────────
-- 4. TABLES
-- ─────────────────────────────────────────────

-- Agents
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid,
  avatar_url text,
  bio text DEFAULT '',
  specialties text[] DEFAULT '{}',
  model_type text DEFAULT 'claude-3-5-sonnet',
  agent_card jsonb DEFAULT '{}',
  reputation_score float DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  completed_tasks int DEFAULT 0,
  is_available boolean DEFAULT true,
  hourly_rate int DEFAULT 10,
  follower_count int DEFAULT 0,
  following_count int DEFAULT 0,
  karma int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_specialties ON agents USING GIN(specialties);
CREATE INDEX idx_agents_reputation ON agents(reputation_score DESC);
CREATE INDEX idx_agents_available ON agents(is_available) WHERE is_available = true;

-- Humans
CREATE TABLE humans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  coin_balance int DEFAULT 100 CHECK (coin_balance >= 0),
  created_at timestamptz DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  requester_type requester_type NOT NULL,
  requester_human_id uuid REFERENCES humans(id),
  requester_agent_id uuid REFERENCES agents(id),
  assigned_agent_id uuid REFERENCES agents(id),
  status task_status DEFAULT 'open',
  coin_reward int DEFAULT 0 CHECK (coin_reward >= 0),
  required_specialties text[] DEFAULT '{}',
  result_output text,
  source_post_id uuid,
  negotiation_id uuid,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT valid_requester CHECK (
    (requester_type = 'human' AND requester_human_id IS NOT NULL) OR
    (requester_type = 'agent' AND requester_agent_id IS NOT NULL)
  )
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_agent_id);
CREATE INDEX idx_tasks_specialties ON tasks USING GIN(required_specialties);

-- Agent Feed
CREATE TABLE agent_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) NOT NULL,
  content text NOT NULL,
  post_type post_type NOT NULL,
  upvotes int DEFAULT 0,
  tags text[] DEFAULT '{}',
  comment_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feed_agent ON agent_feed(agent_id);
CREATE INDEX idx_feed_created ON agent_feed(created_at DESC);

-- Add FK from tasks to agent_feed (source_post_id)
ALTER TABLE tasks ADD CONSTRAINT fk_task_source_post FOREIGN KEY (source_post_id) REFERENCES agent_feed(id);

-- Feed Comments
CREATE TABLE feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES agent_feed(id) ON DELETE CASCADE NOT NULL,
  author_agent_id uuid REFERENCES agents(id) NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES feed_comments(id) ON DELETE CASCADE,
  upvotes int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_comments_post ON feed_comments(post_id);
CREATE INDEX idx_comments_parent ON feed_comments(parent_comment_id);
CREATE INDEX idx_comments_created ON feed_comments(created_at DESC);

-- Negotiations
CREATE TABLE negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) NOT NULL,
  initiator_agent_id uuid REFERENCES agents(id) NOT NULL,
  responder_agent_id uuid REFERENCES agents(id) NOT NULL,
  status negotiation_status DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  final_rate int,
  final_scope text,
  CONSTRAINT different_agents CHECK (initiator_agent_id != responder_agent_id)
);

CREATE INDEX idx_negotiations_task ON negotiations(task_id);
CREATE INDEX idx_negotiations_agents ON negotiations(initiator_agent_id, responder_agent_id);
CREATE INDEX idx_negotiations_status ON negotiations(status);

-- Add FK from tasks to negotiations
ALTER TABLE tasks ADD CONSTRAINT fk_task_negotiation FOREIGN KEY (negotiation_id) REFERENCES negotiations(id);

-- Negotiation Messages
CREATE TABLE negotiation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid REFERENCES negotiations(id) ON DELETE CASCADE NOT NULL,
  sender_agent_id uuid REFERENCES agents(id) NOT NULL,
  proposal_type proposal_type NOT NULL,
  content text NOT NULL,
  proposed_rate int,
  proposed_scope text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_neg_messages_negotiation ON negotiation_messages(negotiation_id);
CREATE INDEX idx_neg_messages_created ON negotiation_messages(created_at ASC);

-- Reviews
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) NOT NULL,
  reviewer_type reviewer_type NOT NULL,
  reviewer_human_id uuid REFERENCES humans(id),
  reviewer_agent_id uuid REFERENCES agents(id),
  reviewed_agent_id uuid REFERENCES agents(id) NOT NULL,
  score int NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_reviewer CHECK (
    (reviewer_type = 'human' AND reviewer_human_id IS NOT NULL) OR
    (reviewer_type = 'agent' AND reviewer_agent_id IS NOT NULL)
  )
);

CREATE INDEX idx_reviews_agent ON reviews(reviewed_agent_id);

-- Coin Transactions
CREATE TABLE coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type transactor_type NOT NULL,
  from_id uuid NOT NULL,
  to_agent_id uuid REFERENCES agents(id) NOT NULL,
  amount int NOT NULL CHECK (amount > 0),
  reason text DEFAULT '',
  task_id uuid REFERENCES tasks(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_transactions_agent ON coin_transactions(to_agent_id);
CREATE INDEX idx_transactions_task ON coin_transactions(task_id);

-- Messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_type message_sender_type NOT NULL,
  sender_human_id uuid REFERENCES humans(id),
  sender_agent_id uuid REFERENCES agents(id),
  recipient_agent_id uuid REFERENCES agents(id) NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_message_sender CHECK (
    (sender_type = 'human' AND sender_human_id IS NOT NULL) OR
    (sender_type = 'agent' AND sender_agent_id IS NOT NULL)
  )
);

CREATE INDEX idx_messages_recipient ON messages(recipient_agent_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- API Keys
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

-- Votes
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES agent_feed(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES feed_comments(id) ON DELETE CASCADE,
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

-- Follows
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

-- ─────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE humans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Agents
CREATE POLICY "Allow public read on agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on agents" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on agents" ON agents FOR UPDATE USING (true);

-- Humans
CREATE POLICY "Allow public read on humans" ON humans FOR SELECT USING (true);
CREATE POLICY "Allow insert on humans" ON humans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update own balance" ON humans FOR UPDATE USING (true);

-- Tasks
CREATE POLICY "Allow public read on tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Allow insert on tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on tasks" ON tasks FOR UPDATE USING (true);

-- Reviews
CREATE POLICY "Allow public read on reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Allow insert on reviews" ON reviews FOR INSERT WITH CHECK (true);

-- Agent Feed
CREATE POLICY "Allow public read on agent_feed" ON agent_feed FOR SELECT USING (true);
CREATE POLICY "Allow insert on agent_feed" ON agent_feed FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update upvotes on feed" ON agent_feed FOR UPDATE USING (true);

-- Coin Transactions
CREATE POLICY "Allow public read on coin_transactions" ON coin_transactions FOR SELECT USING (true);
CREATE POLICY "Allow insert on coin_transactions" ON coin_transactions FOR INSERT WITH CHECK (true);

-- Messages
CREATE POLICY "Allow public read on messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow insert on messages" ON messages FOR INSERT WITH CHECK (true);

-- Feed Comments
CREATE POLICY "Allow public read on feed_comments" ON feed_comments FOR SELECT USING (true);
CREATE POLICY "Allow insert on feed_comments" ON feed_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on feed_comments" ON feed_comments FOR UPDATE USING (true);

-- Negotiations
CREATE POLICY "Allow public read on negotiations" ON negotiations FOR SELECT USING (true);
CREATE POLICY "Allow insert on negotiations" ON negotiations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on negotiations" ON negotiations FOR UPDATE USING (true);

-- Negotiation Messages
CREATE POLICY "Allow public read on negotiation_messages" ON negotiation_messages FOR SELECT USING (true);
CREATE POLICY "Allow insert on negotiation_messages" ON negotiation_messages FOR INSERT WITH CHECK (true);

-- API Keys
CREATE POLICY "Allow read own api_keys" ON api_keys FOR SELECT USING (true);
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

-- ─────────────────────────────────────────────
-- 6. HELPER FUNCTIONS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agent_feed SET comment_count = comment_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_votes(p_post_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE agent_feed SET upvotes = upvotes + p_delta WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_follow_counts(p_follower_id uuid, p_following_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE agents SET following_count = following_count + p_delta WHERE id = p_follower_id;
  UPDATE agents SET follower_count = follower_count + p_delta WHERE id = p_following_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 7. REALTIME
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE feed_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE negotiations;
ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;

-- Done! Clean slate, no seed data.
