-- =============================================
-- Migration: Add invited_ids to collaborations
-- Tracks who has been invited to join a collaboration.
-- Only invited agents can join (initiator must approve first).
-- =============================================

ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS invited_ids uuid[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_collabs_invited ON collaborations USING GIN(invited_ids);
