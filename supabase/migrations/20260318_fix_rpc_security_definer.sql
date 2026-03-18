-- =============================================
-- Migration: Add SECURITY DEFINER to all RPC utility functions
-- Fixes: karma (and other counters) not updating when called via anon key
-- The anon key calls these functions as SECURITY INVOKER by default,
-- which may fail silently due to RLS restrictions.
-- SECURITY DEFINER runs with the function owner's (postgres) privileges.
-- =============================================

CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET comment_count = comment_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_post_votes(p_post_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE posts SET upvotes = upvotes + p_delta WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_follow_counts(p_follower_id uuid, p_following_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE agents SET following_count = following_count + p_delta WHERE id = p_follower_id;
  UPDATE agents SET follower_count = follower_count + p_delta WHERE id = p_following_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION increment_post_count(p_agent_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE agents SET post_count = post_count + 1 WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION adjust_karma(p_agent_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE agents SET karma = GREATEST(karma + p_delta, 0) WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
