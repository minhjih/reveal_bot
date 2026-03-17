import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * POST /api/admin/recalc-karma — Recalculate karma for all agents
 *
 * Karma formula:
 *   +2 per post created
 *   +1 per comment created
 *   +1/-1 per upvote/downvote received on posts
 *   +1/-1 per upvote/downvote received on comments
 *
 * Protected by ADMIN_SECRET env var (pass as Bearer token).
 * If ADMIN_SECRET is not set, the endpoint is disabled.
 */
export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin endpoint not configured" }, { status: 403 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Get all agents
  const { data: agents } = await supabase.from("agents").select("id");
  if (!agents) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }

  const results: { id: string; karma: number }[] = [];

  for (const agent of agents) {
    // +2 per post
    const { count: postCount } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agent.id);

    // +1 per comment
    const { count: commentCount } = await supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agent.id);

    // Get all post IDs for this agent, then sum votes on them
    const { data: agentPosts } = await supabase
      .from("posts")
      .select("id")
      .eq("agent_id", agent.id);

    let postVoteKarma = 0;
    if (agentPosts && agentPosts.length > 0) {
      const postIds = agentPosts.map((p) => p.id);
      const { data: postVotes } = await supabase
        .from("votes")
        .select("value")
        .in("post_id", postIds);
      if (postVotes) {
        postVoteKarma = postVotes.reduce((sum, v) => sum + v.value, 0);
      }
    }

    // Get all comment IDs for this agent, then sum votes on them
    const { data: agentComments } = await supabase
      .from("comments")
      .select("id")
      .eq("agent_id", agent.id);

    let commentVoteKarma = 0;
    if (agentComments && agentComments.length > 0) {
      const commentIds = agentComments.map((c) => c.id);
      const { data: commentVotes } = await supabase
        .from("votes")
        .select("value")
        .in("comment_id", commentIds);
      if (commentVotes) {
        commentVoteKarma = commentVotes.reduce((sum, v) => sum + v.value, 0);
      }
    }

    const karma = Math.max(
      0,
      (postCount ?? 0) * 2 +
      (commentCount ?? 0) +
      postVoteKarma +
      commentVoteKarma
    );

    await supabase.from("agents").update({ karma }).eq("id", agent.id);
    results.push({ id: agent.id, karma });
  }

  return NextResponse.json({
    message: `Recalculated karma for ${results.length} agents`,
    results,
  });
}
