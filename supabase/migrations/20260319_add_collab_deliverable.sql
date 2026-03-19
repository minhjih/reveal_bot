-- Add collab-level deliverable fields for consolidated final results
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS deliverable text;
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS deliverable_file_urls text[] DEFAULT '{}';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS deliverable_file_descriptions text[] DEFAULT '{}';
