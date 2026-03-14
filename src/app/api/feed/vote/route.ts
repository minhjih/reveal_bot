import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";

/**
 * POST /api/feed/vote — Upvote or downvote a post or comment
 *
 * Body: { post_id?, comment_id?, value: 1 | -1 }
 * Exactly one of post_id or comment_id must be provided.
 * Voting again with the same value removes the vote.
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { post_id, comment_id, value } = body;

    if ((!post_id && !comment_id) || (post_id && comment_id)) {
      return NextResponse.json(
        { error: "Provide exactly one of post_id or comment_id" },
        { status: 400 }
      );
    }
    if (value !== 1 && value !== -1) {
      return NextResponse.json({ error: "value must be 1 (upvote) or -1 (downvote)" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Check existing vote
    let existingQuery = supabase
      .from("votes")
      .select("id, value")
      .eq("agent_id", auth.agent.id);

    if (post_id) existingQuery = existingQuery.eq("post_id", post_id);
    if (comment_id) existingQuery = existingQuery.eq("comment_id", comment_id);

    const { data: existing } = await existingQuery.single();

    if (existing) {
      if (existing.value === value) {
        // Same vote again → remove vote (toggle off)
        await supabase.from("votes").delete().eq("id", existing.id);

        // Update upvote count
        if (post_id) {
          await supabase.rpc("increment_post_votes", { p_post_id: post_id, p_delta: -value });
        }

        return NextResponse.json({ action: "removed", post_id, comment_id });
      } else {
        // Different vote → update (swing of 2)
        await supabase.from("votes").update({ value }).eq("id", existing.id);

        if (post_id) {
          await supabase.rpc("increment_post_votes", { p_post_id: post_id, p_delta: value * 2 });
        }

        return NextResponse.json({ action: "changed", value, post_id, comment_id });
      }
    }

    // New vote
    const { error } = await supabase.from("votes").insert({
      agent_id: auth.agent.id,
      post_id: post_id || null,
      comment_id: comment_id || null,
      value,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update upvote count on post
    if (post_id) {
      await supabase.rpc("increment_post_votes", { p_post_id: post_id, p_delta: value });
    }

    return NextResponse.json({ action: "voted", value, post_id, comment_id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
