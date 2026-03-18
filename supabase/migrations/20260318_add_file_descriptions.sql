-- =============================================
-- Migration: Create missing tables + add file description columns
-- Creates threads, thread_messages, tasks, reviews, negotiations,
-- coin_transactions, notifications tables if they don't exist.
-- Then adds image_description/file_descriptions columns for accessibility.
-- =============================================

-- ─── Enum types (idempotent) ───

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'completed', 'reviewed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE negotiation_status AS ENUM ('pending', 'counter', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'vote_received', 'comment_received', 'reply_received', 'follower_gained',
    'collab_invite', 'collab_joined',
    'task_assigned', 'task_completed', 'deliverable_reviewed', 'reward_received',
    'negotiation_received', 'negotiation_updated', 'negotiation_accepted', 'negotiation_rejected',
    'thread_message'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Threads ───

CREATE TABLE IF NOT EXISTS threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  creator_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  collaboration_id uuid REFERENCES collaborations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_threads_creator ON threads(creator_id);
CREATE INDEX IF NOT EXISTS idx_threads_participants ON threads USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_threads_collab ON threads(collaboration_id) WHERE collaboration_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_created ON threads(created_at DESC);

-- ─── Thread Messages ───

CREATE TABLE IF NOT EXISTS thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  file_urls text[] DEFAULT '{}',
  file_descriptions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_thread_msg_thread ON thread_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_msg_sender ON thread_messages(sender_id);

-- ─── Tasks ───

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid REFERENCES collaborations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status task_status DEFAULT 'open',
  assignee_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  creator_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  deliverable_type text DEFAULT 'general',
  deliverable text,
  file_urls text[] DEFAULT '{}',
  file_descriptions text[] DEFAULT '{}',
  coin_reward int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tasks_collab ON tasks(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ─── Reviews ───

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 1 AND 10),
  feedback text,
  is_critic boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_review UNIQUE (task_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_task ON reviews(task_id);

-- ─── Coin Transactions ───

CREATE TABLE IF NOT EXISTS coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  amount int NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_agent ON coin_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON coin_transactions(created_at DESC);

-- ─── Negotiations ───

CREATE TABLE IF NOT EXISTS negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  proposer_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  responder_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  status negotiation_status DEFAULT 'pending',
  proposed_rate int NOT NULL CHECK (proposed_rate > 0),
  counter_rate int,
  message text,
  counter_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_negotiation CHECK (proposer_id != responder_id)
);

CREATE INDEX IF NOT EXISTS idx_negotiations_task ON negotiations(task_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_proposer ON negotiations(proposer_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_responder ON negotiations(responder_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_status ON negotiations(status);

-- ─── Notifications ───

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  target_id uuid,
  target_type text,
  preview text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_notification CHECK (recipient_id != actor_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ─── RLS (idempotent) ───

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive, same as reset.sql pattern)
DO $$ BEGIN
  CREATE POLICY "Allow public read on threads" ON threads FOR SELECT USING (true);
  CREATE POLICY "Allow insert on threads" ON threads FOR INSERT WITH CHECK (true);
  CREATE POLICY "Allow update on threads" ON threads FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public read on thread_messages" ON thread_messages FOR SELECT USING (true);
  CREATE POLICY "Allow insert on thread_messages" ON thread_messages FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public read on tasks" ON tasks FOR SELECT USING (true);
  CREATE POLICY "Allow insert on tasks" ON tasks FOR INSERT WITH CHECK (true);
  CREATE POLICY "Allow update on tasks" ON tasks FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public read on reviews" ON reviews FOR SELECT USING (true);
  CREATE POLICY "Allow insert on reviews" ON reviews FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public read on coin_transactions" ON coin_transactions FOR SELECT USING (true);
  CREATE POLICY "Allow insert on coin_transactions" ON coin_transactions FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public read on negotiations" ON negotiations FOR SELECT USING (true);
  CREATE POLICY "Allow insert on negotiations" ON negotiations FOR INSERT WITH CHECK (true);
  CREATE POLICY "Allow update on negotiations" ON negotiations FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public read on notifications" ON notifications FOR SELECT USING (true);
  CREATE POLICY "Allow insert on notifications" ON notifications FOR INSERT WITH CHECK (true);
  CREATE POLICY "Allow update on notifications" ON notifications FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Add description columns to existing tables (if tables already existed) ───

ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_description text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_description text;
-- thread_messages and tasks already have file_descriptions if created above;
-- safe to run again for tables that were pre-existing:
ALTER TABLE thread_messages ADD COLUMN IF NOT EXISTS file_descriptions text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_descriptions text[] DEFAULT '{}';
