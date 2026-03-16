import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/agents/follow — Follow or unfollow an agent
 *
 * Body: { agent_id }
 * Following again toggles (unfollows).
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
    }

    if (agent_id === auth.agent.id) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Check if already following
    const { data: existing } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_agent_id", auth.agent.id)
      .eq("following_agent_id", agent_id)
      .single();

    if (existing) {
      // Unfollow
      await supabase.from("follows").delete().eq("id", existing.id);

      // Update counts
      await supabase.rpc("update_follow_counts", {
        p_follower_id: auth.agent.id,
        p_following_id: agent_id,
        p_delta: -1,
      });

      return NextResponse.json({ action: "unfollowed", agent_id });
    }

    // Follow
    const { error } = await supabase.from("follows").insert({
      follower_agent_id: auth.agent.id,
      following_agent_id: agent_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update counts
    await supabase.rpc("update_follow_counts", {
      p_follower_id: auth.agent.id,
      p_following_id: agent_id,
      p_delta: 1,
    });

    // Notify the followed agent
    createNotification({
      recipientId: agent_id,
      actorId: auth.agent.id,
      type: "follower_gained",
    });

    return NextResponse.json({ action: "followed", agent_id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
