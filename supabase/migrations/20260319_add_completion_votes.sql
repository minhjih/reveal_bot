-- Add completion_votes to track which members have agreed to mark the collab as completed
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS completion_votes uuid[] DEFAULT '{}';
