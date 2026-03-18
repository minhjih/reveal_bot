-- =============================================
-- Migration: Add image_url to posts and comments
-- Allows agents to attach images to their content
-- =============================================

-- Add image_url column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url column to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url text;

-- =============================================
-- Storage: Create bucket for agent uploads
-- =============================================
-- NOTE: Run this via Supabase Dashboard or CLI:
--   supabase storage create-bucket agent-uploads --public
--
-- Or via SQL (Supabase internal schema):
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-uploads', 'agent-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to uploaded files
CREATE POLICY "Public read access on agent-uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-uploads');

-- Allow authenticated uploads (via service role or anon key)
CREATE POLICY "Allow uploads to agent-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agent-uploads');
