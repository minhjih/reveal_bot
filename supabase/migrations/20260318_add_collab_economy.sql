-- =============================================
-- Migration: Add collaboration economy columns & missing schema
-- Adds coin_reward_pool, coin_balance, collab_count, etc.
-- Safe to run on existing DB — all operations are idempotent.
-- =============================================

-- ─── 1. Enum types (create if not exists) ───

DO $$ BEGIN
  CREATE TYPE collab_status AS ENUM ('proposed', 'active', 'completed', 'dissolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add missing values to notification_type if they don't exist
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'mention';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'dm_received';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 2. Agents table — add economy columns ───

ALTER TABLE agents ADD COLUMN IF NOT EXISTS collab_count int DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS coin_balance int DEFAULT 100;

-- ─── 3. Collaborations table — add missing columns ───

-- The collaborations table may exist with only basic columns.
-- Add all columns that reset.sql defines but may be missing.

ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS source_post_id uuid;
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS member_ids uuid[] DEFAULT '{}';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS coin_reward_pool int DEFAULT 0;
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Add status column with collab_status type if missing
-- (may already exist as text — handle gracefully)
DO $$
BEGIN
  -- Try adding as collab_status enum
  ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS status collab_status DEFAULT 'proposed';
EXCEPTION WHEN others THEN
  -- Column may already exist as different type; that's okay
  NULL;
END $$;

-- Add foreign key on source_post_id if not already set
DO $$
BEGIN
  ALTER TABLE collaborations
    ADD CONSTRAINT collaborations_source_post_id_fkey
    FOREIGN KEY (source_post_id) REFERENCES posts(id);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;

-- ─── 4. Indexes on collaborations ───

CREATE INDEX IF NOT EXISTS idx_collabs_status ON collaborations(status);
CREATE INDEX IF NOT EXISTS idx_collabs_initiator ON collaborations(initiator_id);
CREATE INDEX IF NOT EXISTS idx_collabs_members ON collaborations USING GIN(member_ids);
CREATE INDEX IF NOT EXISTS idx_collabs_created ON collaborations(created_at DESC);

-- ─── 5. RLS on collaborations ───

ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow public read on collaborations" ON collaborations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow insert on collaborations" ON collaborations FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow update on collaborations" ON collaborations FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. Helper functions (idempotent via CREATE OR REPLACE) ───

CREATE OR REPLACE FUNCTION increment_collab_count(p_agent_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agents SET collab_count = collab_count + 1 WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION adjust_coin_balance(p_agent_id uuid, p_amount int)
RETURNS void AS $$
BEGIN
  UPDATE agents SET coin_balance = coin_balance + p_amount WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. Realtime (safe to re-add) ───

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE collaborations;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE negotiations;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE coin_transactions;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE threads;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE thread_messages;
EXCEPTION WHEN others THEN NULL;
END $$;
