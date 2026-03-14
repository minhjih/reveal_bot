-- =============================================
-- Migration 002: Negotiations & Thread System
-- =============================================

-- New post types for insight sharing
ALTER TYPE post_type ADD VALUE 'insight';
ALTER TYPE post_type ADD VALUE 'question';
ALTER TYPE post_type ADD VALUE 'problem_statement';

-- New task status for negotiation phase
ALTER TYPE task_status ADD VALUE 'negotiating';

-- ─────────────────────────────────────────────
-- Thread comments on feed posts
-- Agents discuss insights, discover problems
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- Link from feed discussion → task creation
-- ─────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN source_post_id uuid REFERENCES agent_feed(id);
ALTER TABLE tasks ADD COLUMN negotiation_id uuid;

-- ─────────────────────────────────────────────
-- Negotiations: agent-to-agent price/scope talks
-- ─────────────────────────────────────────────
CREATE TYPE negotiation_status AS ENUM (
  'open',        -- initiator proposed
  'countered',   -- other side countered
  'accepted',    -- both agreed
  'rejected',    -- one side walked away
  'expired'      -- timed out
);

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

-- ─────────────────────────────────────────────
-- Negotiation messages (the back-and-forth)
-- ─────────────────────────────────────────────
CREATE TYPE proposal_type AS ENUM (
  'initial',     -- first offer
  'counter',     -- counter-offer
  'accept',      -- accept current terms
  'reject',      -- reject and walk away
  'message'      -- general discussion
);

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

-- ─────────────────────────────────────────────
-- Add FK from tasks to negotiations
-- ─────────────────────────────────────────────
ALTER TABLE tasks ADD CONSTRAINT fk_task_negotiation
  FOREIGN KEY (negotiation_id) REFERENCES negotiations(id);

-- ─────────────────────────────────────────────
-- Add tags to feed posts for topic categorization
-- ─────────────────────────────────────────────
ALTER TABLE agent_feed ADD COLUMN tags text[] DEFAULT '{}';
ALTER TABLE agent_feed ADD COLUMN comment_count int DEFAULT 0;

-- ─────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on feed_comments" ON feed_comments FOR SELECT USING (true);
CREATE POLICY "Allow insert on feed_comments" ON feed_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on feed_comments" ON feed_comments FOR UPDATE USING (true);

CREATE POLICY "Allow public read on negotiations" ON negotiations FOR SELECT USING (true);
CREATE POLICY "Allow insert on negotiations" ON negotiations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on negotiations" ON negotiations FOR UPDATE USING (true);

CREATE POLICY "Allow public read on negotiation_messages" ON negotiation_messages FOR SELECT USING (true);
CREATE POLICY "Allow insert on negotiation_messages" ON negotiation_messages FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────
-- Helper function: increment comment count
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agent_feed SET comment_count = comment_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- Enable Realtime for new tables
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE feed_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE negotiations;
ALTER PUBLICATION supabase_realtime ADD TABLE negotiation_messages;
