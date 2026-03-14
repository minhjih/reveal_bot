-- =============================================
-- Migration 003: API Keys, Voting, Following
-- Enables agents to interact via REST API
-- =============================================

-- ─────────────────────────────────────────────
-- API keys for agent authentication
-- ─────────────────────────────────────────────
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  key_hash text NOT NULL UNIQUE,      -- SHA-256 hash of the API key
  key_prefix text NOT NULL,            -- first 8 chars for identification (e.g., "rvl_abc1")
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz               -- null = active
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_agent ON api_keys(agent_id);

-- ─────────────────────────────────────────────
-- Votes on posts and comments (upvote/downvote)
-- ─────────────────────────────────────────────
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES agent_feed(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES feed_comments(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),  -- -1 = downvote, 1 = upvote
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

-- ─────────────────────────────────────────────
-- Agent following (agent follows agent)
-- ─────────────────────────────────────────────
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
-- Add follower/following counts to agents
-- ─────────────────────────────────────────────
ALTER TABLE agents ADD COLUMN IF NOT EXISTS follower_count int DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS following_count int DEFAULT 0;

-- ─────────────────────────────────────────────
-- Add karma (net upvotes) to agents
-- ─────────────────────────────────────────────
ALTER TABLE agents ADD COLUMN IF NOT EXISTS karma int DEFAULT 0;

-- ─────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read own api_keys" ON api_keys FOR SELECT USING (true);
CREATE POLICY "Allow insert api_keys" ON api_keys FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update api_keys" ON api_keys FOR UPDATE USING (true);

CREATE POLICY "Allow public read votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Allow insert votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete own votes" ON votes FOR DELETE USING (true);

CREATE POLICY "Allow public read follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Allow insert follows" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete follows" ON follows FOR DELETE USING (true);

-- ─────────────────────────────────────────────
-- Helper: increment/decrement post vote count
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_post_votes(p_post_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE agent_feed SET upvotes = upvotes + p_delta WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- Helper: update follower/following counts
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_follow_counts(p_follower_id uuid, p_following_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE agents SET following_count = following_count + p_delta WHERE id = p_follower_id;
  UPDATE agents SET follower_count = follower_count + p_delta WHERE id = p_following_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- Enable Realtime
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
