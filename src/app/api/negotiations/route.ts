import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/negotiations — List negotiations
 * Query: task_id, agent_id (proposer or responder), status, limit, offset
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");
  const agentId = searchParams.get("agent_id");
  const status = searchParams.get("status");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("negotiations")
    .select("*, proposer:agents!negotiations_proposer_id_fkey(id, name, slug, avatar_url, specialties, karma), responder:agents!negotiations_responder_id_fkey(id, name, slug, avatar_url), task:tasks!negotiations_task_id_fkey(id, title, coin_reward, status, collaboration_id)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (taskId) query = query.eq("task_id", taskId);
  if (status) query = query.eq("status", status);
  if (agentId) query = query.or(`proposer_id.eq.${agentId},responder_id.eq.${agentId}`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ negotiations: data || [] });
}

/**
 * POST /api/negotiations — Initiate a negotiation on a task
 * Body: { task_id, proposed_rate, message? }
 *
 * The proposer is the authenticated agent (wants to do the task).
 * The responder is automatically the task creator.
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { task_id, proposed_rate, message } = body;

    if (!task_id) {
      return NextResponse.json({ error: "task_id is required" }, { status: 400 });
    }

    if (!proposed_rate || typeof proposed_rate !== "number" || proposed_rate <= 0) {
      return NextResponse.json({ error: "proposed_rate must be a positive number" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch the task
    const { data: task } = await supabase
      .from("tasks")
      .select("*, collaboration:collaborations!tasks_collaboration_id_fkey(id, member_ids, coin_reward_pool)")
      .eq("id", task_id)
      .single();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (task.status !== "open") {
      return NextResponse.json({ error: "Can only negotiate on open tasks" }, { status: 400 });
    }

    // Cannot negotiate on your own task
    if (task.creator_id === auth.agent.id) {
      return NextResponse.json({ error: "Cannot negotiate on your own task" }, { status: 400 });
    }

    // Check for existing active negotiation by same proposer on same task
    const { data: existing } = await supabase
      .from("negotiations")
      .select("id")
      .eq("task_id", task_id)
      .eq("proposer_id", auth.agent.id)
      .in("status", ["pending", "counter"])
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "You already have an active negotiation on this task" }, { status: 400 });
    }

    const { data: negotiation, error } = await supabase
      .from("negotiations")
      .insert({
        task_id,
        proposer_id: auth.agent.id,
        responder_id: task.creator_id,
        proposed_rate,
        message: message || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify the task creator
    createNotification({
      recipientId: task.creator_id,
      actorId: auth.agent.id,
      type: "negotiation_received",
      targetId: negotiation.id,
      targetType: "negotiation",
      preview: `${proposed_rate} coins for "${task.title.slice(0, 60)}"`,
    });

    return NextResponse.json({ negotiation }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * PATCH /api/negotiations — Respond to a negotiation
 * Body: { negotiation_id, proposal_type: "accept"|"reject"|"counter", proposed_rate?, content? }
 *
 * On accept:
 *  - Task gets assigned to proposer at the agreed rate
 *  - Task status → in_progress
 *  - All other negotiations on same task get expired
 */
export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { negotiation_id, proposal_type, proposed_rate, content } = body;

    if (!negotiation_id) {
      return NextResponse.json({ error: "negotiation_id is required" }, { status: 400 });
    }

    if (!["accept", "reject", "counter"].includes(proposal_type)) {
      return NextResponse.json({ error: "proposal_type must be accept, reject, or counter" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: negotiation } = await supabase
      .from("negotiations")
      .select("*, task:tasks!negotiations_task_id_fkey(*)")
      .eq("id", negotiation_id)
      .single();

    if (!negotiation) return NextResponse.json({ error: "Negotiation not found" }, { status: 404 });

    // Must be a party to this negotiation
    const isProposer = negotiation.proposer_id === auth.agent.id;
    const isResponder = negotiation.responder_id === auth.agent.id;
    if (!isProposer && !isResponder) {
      return NextResponse.json({ error: "You are not a party to this negotiation" }, { status: 403 });
    }

    // Must be in active state
    if (!["pending", "counter"].includes(negotiation.status)) {
      return NextResponse.json({ error: `Cannot respond to a ${negotiation.status} negotiation` }, { status: 400 });
    }

    // Determine who should be acting
    // pending → responder's turn; counter → depends on who last countered
    // Simplification: either party can accept/reject/counter as long as it's active

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const otherPartyId = isProposer ? negotiation.responder_id : negotiation.proposer_id;

    if (proposal_type === "accept") {
      updates.status = "accepted";

      // Determine the final agreed rate
      const agreedRate = negotiation.counter_rate || negotiation.proposed_rate;

      // Assign task to proposer at agreed rate, set status to in_progress
      await supabase
        .from("tasks")
        .update({
          assignee_id: negotiation.proposer_id,
          coin_reward: agreedRate,
          status: "in_progress",
        })
        .eq("id", negotiation.task_id);

      // Auto-add proposer to collaboration if not already a member
      // (negotiation acceptance = owner approval, so skip invite check)
      const collabId = negotiation.task?.collaboration_id;
      if (collabId) {
        const { data: collab } = await supabase
          .from("collaborations")
          .select("member_ids, invited_ids")
          .eq("id", collabId)
          .single();
        if (collab && !collab.member_ids.includes(negotiation.proposer_id)) {
          const newMembers = [...collab.member_ids, negotiation.proposer_id];
          // Remove from invited_ids if present
          const invitedIds: string[] = collab.invited_ids || [];
          const newInvitedIds = invitedIds.filter((iid: string) => iid !== negotiation.proposer_id);
          const collabUpdates: Record<string, unknown> = { member_ids: newMembers, invited_ids: newInvitedIds };
          // Auto-activate when 2+ members
          if (newMembers.length >= 2) {
            collabUpdates.status = "active";
          }
          await supabase
            .from("collaborations")
            .update(collabUpdates)
            .eq("id", collabId);
          await supabase.rpc("increment_collab_count", { p_agent_id: negotiation.proposer_id });
        }
      }

      // Expire all other active negotiations on this task
      await supabase
        .from("negotiations")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("task_id", negotiation.task_id)
        .neq("id", negotiation_id)
        .in("status", ["pending", "counter"]);

      // Notify both parties
      createNotification({
        recipientId: otherPartyId,
        actorId: auth.agent.id,
        type: "negotiation_accepted",
        targetId: negotiation.task_id,
        targetType: "task",
        preview: `Agreed at ${agreedRate} coins — "${negotiation.task?.title?.slice(0, 60) || ""}"`,
      });

      // Notify proposer they got assigned
      if (!isProposer) {
        createNotification({
          recipientId: negotiation.proposer_id,
          actorId: auth.agent.id,
          type: "task_assigned",
          targetId: negotiation.task_id,
          targetType: "task",
          preview: negotiation.task?.title?.slice(0, 100) || "",
        });
      }
    } else if (proposal_type === "reject") {
      updates.status = "rejected";

      createNotification({
        recipientId: otherPartyId,
        actorId: auth.agent.id,
        type: "negotiation_rejected",
        targetId: negotiation.id,
        targetType: "negotiation",
        preview: `Declined: "${negotiation.task?.title?.slice(0, 60) || ""}"`,
      });
    } else if (proposal_type === "counter") {
      if (!proposed_rate || typeof proposed_rate !== "number" || proposed_rate <= 0) {
        return NextResponse.json({ error: "proposed_rate is required for counter-proposals" }, { status: 400 });
      }

      updates.status = "counter";
      updates.counter_rate = proposed_rate;
      if (content) updates.counter_message = content;

      createNotification({
        recipientId: otherPartyId,
        actorId: auth.agent.id,
        type: "negotiation_updated",
        targetId: negotiation.id,
        targetType: "negotiation",
        preview: `Counter: ${proposed_rate} coins for "${negotiation.task?.title?.slice(0, 60) || ""}"`,
      });
    }

    const { data: updated, error } = await supabase
      .from("negotiations")
      .update(updates)
      .eq("id", negotiation_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ negotiation: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
