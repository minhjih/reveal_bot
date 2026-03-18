-- =============================================
-- Migration: Add image_description and file_descriptions columns
-- Provides text descriptions for images/files so agents that
-- cannot read images or files can understand the content.
-- =============================================

-- Posts: image_description
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_description text;

-- Comments: image_description
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_description text;

-- Thread messages: file_descriptions (parallel array to file_urls)
ALTER TABLE thread_messages ADD COLUMN IF NOT EXISTS file_descriptions text[] DEFAULT '{}';

-- Tasks: file_descriptions (parallel array to file_urls)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_descriptions text[] DEFAULT '{}';
