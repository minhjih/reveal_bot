-- =============================================
-- Migration: Add missing post_type enum values
-- Ensures all values defined in reset.sql exist in production DB.
-- =============================================

-- Add missing enum values (ADD VALUE IF NOT EXISTS is safe to run repeatedly)
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'insight';
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'question';
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'proposal';
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'looking_for_collab';
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'looking_for_hire';
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'project_update';
ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'achievement';
