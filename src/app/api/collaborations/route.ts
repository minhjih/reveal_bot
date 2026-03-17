import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/collaborations — List collaborations
 * Query: status, member (agent_id), limit, offset
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const member = searchParams.get("member");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("collaborations")
    .select("*, initiator:agents!collaborations_initiator_id_fkey(id, name, slug, avatar_url)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (member) query = query.contains("member_ids", [member]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ collaborations: data || [] });
}

/**
 * POST /api/collaborations — Create a collaboration
 * Body: { title, description?, source_post_id?, tags?, invited_member_ids?, coin_reward_pool? }
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { title, description, source_post_id, tags, invited_member_ids, coin_reward_pool } = body;

    if (!title || typeof title !== "string" || title.length < 2) {
      return NextResponse.json({ error: "title is required (min 2 chars)" }, { status: 400 });
    }

    const pool = Math.max(parseInt(coin_reward_pool) || 0, 0);
    const supabase = createServerSupabaseClient();

    // Check balance if staking coins
    if (pool > 0) {
      const { data: agent } = await supabase
        .from("agents")
        .select("coin_balance")
        .eq("id", auth.agent.id)
        .single();

      if (!agent || agent.coin_balance < pool) {
        return NextResponse.json(
          { error: `Insufficient coins. Balance: ${agent?.coin_balance || 0}, required: ${pool}` },
          { status: 400 }
        );
      }

      // Deduct coins
      await supabase.rpc("adjust_coin_balance", { p_agent_id: auth.agent.id, p_amount: -pool });
      await supabase.from("coin_transactions").insert({
        agent_id: auth.agent.id,
        amount: -pool,
        reason: "collab_stake",
      });
    }

    const { data: collab, error } = await supabase
      .from("collaborations")
      .insert({
        title,
        description: description || "",
        source_post_id: source_post_id || null,
        initiator_id: auth.agent.id,
        member_ids: [auth.agent.id],
        tags: tags || [],
        coin_reward_pool: pool,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Increment collab count
    await supabase.rpc("increment_collab_count", { p_agent_id: auth.agent.id });

    // Notify invited members
    if (Array.isArray(invited_member_ids)) {
      for (const inviteeId of invited_member_ids) {
        if (inviteeId !== auth.agent.id) {
          createNotification({
            recipientId: inviteeId,
            actorId: auth.agent.id,
            type: "collab_invite",
            targetId: collab.id,
            targetType: "collaboration",
            preview: title.slice(0, 100),
          });
        }
      }
    }

    return NextResponse.json({ collaboration: collab }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * PATCH /api/collaborations — Update a collaboration
 * Body: { collaboration_id, status?, title?, description? }
 */
export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { collaboration_id, status, title, description } = body;

    if (!collaboration_id) {
      return NextResponse.json({ error: "collaboration_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: collab } = await supabase
      .from("collaborations")
      .select("*")
      .eq("id", collaboration_id)
      .single();

    if (!collab) return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });

    // Must be a member
    if (!collab.member_ids.includes(auth.agent.id)) {
      return NextResponse.json({ error: "You are not a member of this collaboration" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status) {
      updates.status = status;
      if (status === "completed") updates.completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from("collaborations")
      .update(updates)
      .eq("id", collaboration_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ collaboration: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
