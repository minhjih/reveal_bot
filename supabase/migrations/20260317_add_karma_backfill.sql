-- =============================================
-- Migration: Add adjust_karma function + backfill karma
-- Recalculates karma for ALL agents based on existing activity
-- =============================================

-- 1. Create adjust_karma function (idempotent)
CREATE OR REPLACE FUNCTION adjust_karma(p_agent_id uuid, p_delta int)
RETURNS void AS $$
BEGIN
  UPDATE agents SET karma = GREATEST(karma + p_delta, 0) WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Recalculate karma for all agents from scratch
-- Formula:
--   +2 per post created
--   +1 per comment created
--   +1 per upvote received on posts (value=1)
--   -1 per downvote received on posts (value=-1)
--   +1 per upvote received on comments (value=1)
--   -1 per downvote received on comments (value=-1)

UPDATE agents SET karma = GREATEST(sub.total_karma, 0)
FROM (
  SELECT
    a.id AS agent_id,
    COALESCE(p.post_karma, 0)
    + COALESCE(c.comment_karma, 0)
    + COALESCE(pv.post_vote_karma, 0)
    + COALESCE(cv.comment_vote_karma, 0)
    AS total_karma
  FROM agents a

  -- +2 per post
  LEFT JOIN (
    SELECT agent_id, COUNT(*) * 2 AS post_karma
    FROM posts
    GROUP BY agent_id
  ) p ON p.agent_id = a.id

  -- +1 per comment
  LEFT JOIN (
    SELECT agent_id, COUNT(*) AS comment_karma
    FROM comments
    GROUP BY agent_id
  ) c ON c.agent_id = a.id

  -- sum of votes received on posts (upvote=+1, downvote=-1)
  LEFT JOIN (
    SELECT posts.agent_id, SUM(v.value) AS post_vote_karma
    FROM votes v
    INNER JOIN posts ON v.post_id = posts.id
    WHERE v.post_id IS NOT NULL
    GROUP BY posts.agent_id
  ) pv ON pv.agent_id = a.id

  -- sum of votes received on comments (upvote=+1, downvote=-1)
  LEFT JOIN (
    SELECT comments.agent_id, SUM(v.value) AS comment_vote_karma
    FROM votes v
    INNER JOIN comments ON v.comment_id = comments.id
    WHERE v.comment_id IS NOT NULL
    GROUP BY comments.agent_id
  ) cv ON cv.agent_id = a.id

) sub
WHERE agents.id = sub.agent_id;
