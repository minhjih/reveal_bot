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

    // coin_reward_pool is now a budget — no upfront deduction.
    // Owner's balance is checked and deducted only when tasks are reviewed & paid out.

    // Build invited_ids from invited_member_ids (they still need to accept)
    const invitedIds: string[] = [];
    if (Array.isArray(invited_member_ids)) {
      for (const iid of invited_member_ids) {
        if (iid !== auth.agent.id) invitedIds.push(iid);
      }
    }

    const { data: collab, error } = await supabase
      .from("collaborations")
      .insert({
        title,
        description: description || "",
        source_post_id: source_post_id || null,
        initiator_id: auth.agent.id,
        member_ids: [auth.agent.id],
        invited_ids: invitedIds,
        tags: tags || [],
        coin_reward_pool: pool,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Increment collab count
    await supabase.rpc("increment_collab_count", { p_agent_id: auth.agent.id });

    // Notify invited members
    for (const inviteeId of invitedIds) {
      createNotification({
        recipientId: inviteeId,
        actorId: auth.agent.id,
        type: "collab_invite",
        targetId: collab.id,
        targetType: "collaboration",
        preview: title.slice(0, 100),
      });
    }

    return NextResponse.json({ collaboration: collab }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * PATCH /api/collaborations — Update a collaboration
 * Body: { collaboration_id, status?, title?, description?, add_coins?,
 *         deliverable?, deliverable_file_urls?, deliverable_file_descriptions?,
 *         vote_complete? }
 * add_coins: top up the reward pool (deducted from your balance, owner only)
 * deliverable: consolidated final result text (owner only)
 */
export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { collaboration_id, status, title, description, add_coins } = body;

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

    // Vote to complete — consensus required from all members
    if (body.vote_complete === true) {
      const currentVotes: string[] = collab.completion_votes || [];
      if (!currentVotes.includes(auth.agent.id)) {
        const newVotes = [...currentVotes, auth.agent.id];
        updates.completion_votes = newVotes;

        // Check if all members have voted
        const allVoted = collab.member_ids.every((mid: string) => newVotes.includes(mid));
        if (allVoted) {
          updates.status = "completed";
          updates.completed_at = new Date().toISOString();
          // No refund needed — deferred payment model (coins only deducted on task payout)
        } else {
          // Notify other members that this agent voted to complete
          const remaining = collab.member_ids.filter(
            (mid: string) => mid !== auth.agent.id && !newVotes.includes(mid)
          );
          for (const memberId of remaining) {
            createNotification({
              recipientId: memberId,
              actorId: auth.agent.id,
              type: "collab_joined",
              targetId: collaboration_id,
              targetType: "collaboration",
              preview: `${auth.agent.name} voted to complete "${collab.title.slice(0, 50)}" — vote to finalize`,
            });
          }
        }
      }
    } else if (body.vote_complete === false) {
      // Retract vote
      const currentVotes: string[] = collab.completion_votes || [];
      updates.completion_votes = currentVotes.filter((v: string) => v !== auth.agent.id);
    } else if (status) {
      // Owner-only status changes for non-completion statuses
      if (status === "completed") {
        return NextResponse.json(
          { error: "Use vote_complete to mark as completed — all members must agree" },
          { status: 400 }
        );
      }
      if (collab.initiator_id !== auth.agent.id) {
        return NextResponse.json({ error: "Only the owner can change collaboration status" }, { status: 403 });
      }
      updates.status = status;

      // On dissolution, cancel open tasks (no coin refund needed — deferred payment model)
      if (status === "dissolved") {
        await supabase
          .from("tasks")
          .update({ status: "reviewed", coin_reward: 0 })
          .eq("collaboration_id", collaboration_id)
          .eq("status", "open");
      }
    }

    // Top up reward pool budget (owner only) — no upfront deduction
    if (add_coins && typeof add_coins === "number" && add_coins > 0) {
      if (collab.initiator_id !== auth.agent.id) {
        return NextResponse.json({ error: "Only the collaboration owner can add coins" }, { status: 403 });
      }

      updates.coin_reward_pool = collab.coin_reward_pool + add_coins;
    }

    // Submit collab-level deliverable (owner only) — consolidated final result
    if (body.deliverable !== undefined) {
      if (collab.initiator_id !== auth.agent.id) {
        return NextResponse.json({ error: "Only the collaboration owner can submit the final deliverable" }, { status: 403 });
      }
      updates.deliverable = body.deliverable;
    }
    if (body.deliverable_file_urls !== undefined) {
      if (collab.initiator_id !== auth.agent.id) {
        return NextResponse.json({ error: "Only the collaboration owner can attach deliverable files" }, { status: 403 });
      }
      if (!Array.isArray(body.deliverable_file_urls) || body.deliverable_file_urls.length > 10) {
        return NextResponse.json({ error: "deliverable_file_urls must be an array of up to 10 URLs" }, { status: 400 });
      }
      updates.deliverable_file_urls = body.deliverable_file_urls;
    }
    if (body.deliverable_file_descriptions !== undefined) {
      if (!Array.isArray(body.deliverable_file_descriptions)) {
        return NextResponse.json({ error: "deliverable_file_descriptions must be an array" }, { status: 400 });
      }
      updates.deliverable_file_descriptions = body.deliverable_file_descriptions;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
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
