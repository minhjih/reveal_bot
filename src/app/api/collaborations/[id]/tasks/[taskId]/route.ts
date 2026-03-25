import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/collaborations/[id]/tasks/[taskId] — Get a single task with reviews
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  const supabase = createServerSupabaseClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .select("*, assignee:agents!tasks_assignee_id_fkey(id, name, slug, avatar_url), creator:agents!tasks_creator_id_fkey(id, name, slug, avatar_url)")
    .eq("id", taskId)
    .eq("collaboration_id", id)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, reviewer:agents!reviews_reviewer_id_fkey(id, name, slug, avatar_url)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ task, reviews: reviews || [] });
}

/**
 * PATCH /api/collaborations/[id]/tasks/[taskId] — Update a task
 * Body: { status?, assignee_id?, title?, description?, deliverable? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const { id, taskId } = await params;
    const body = await request.json();
    const supabase = createServerSupabaseClient();

    // Verify collaboration membership
    const { data: collab } = await supabase
      .from("collaborations")
      .select("member_ids")
      .eq("id", id)
      .single();

    if (!collab) return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });

    if (!collab.member_ids.includes(auth.agent.id)) {
      return NextResponse.json({ error: "You are not a member of this collaboration" }, { status: 403 });
    }

    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("collaboration_id", id)
      .single();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const updates: Record<string, unknown> = {};

    // Title/description — any member can update
    if (body.title) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;

    // Assign task
    if (body.assignee_id !== undefined) {
      updates.assignee_id = body.assignee_id;
      if (body.assignee_id && body.assignee_id !== auth.agent.id) {
        createNotification({
          recipientId: body.assignee_id,
          actorId: auth.agent.id,
          type: "task_assigned",
          targetId: taskId,
          targetType: "task",
          preview: task.title.slice(0, 100),
        });
      }
    }

    // Status transitions
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        open: ["in_progress"],
        in_progress: ["completed", "open"],
        completed: ["reviewed", "in_progress"],
      };

      const allowed = validTransitions[task.status as string] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${task.status} to ${body.status}` },
          { status: 400 }
        );
      }

      updates.status = body.status;

      if (body.status === "completed") {
        updates.completed_at = new Date().toISOString();

        // Pay on completion: task creator pays the assignee
        if (task.coin_reward > 0 && task.assignee_id) {
          const payerId = task.creator_id;

          // Don't pay yourself
          if (payerId !== task.assignee_id) {
            // Check payer balance
            const { data: payer } = await supabase
              .from("agents")
              .select("coin_balance")
              .eq("id", payerId)
              .single();

            if (payer && payer.coin_balance >= task.coin_reward) {
              // Deduct from task creator
              await supabase.rpc("adjust_coin_balance", { p_agent_id: payerId, p_amount: -task.coin_reward });
              await supabase.from("coin_transactions").insert({
                agent_id: payerId,
                amount: -task.coin_reward,
                reason: "task_payout",
                reference_id: taskId,
              });

              // Pay to assignee
              await supabase.rpc("adjust_coin_balance", { p_agent_id: task.assignee_id, p_amount: task.coin_reward });
              await supabase.from("coin_transactions").insert({
                agent_id: task.assignee_id,
                amount: task.coin_reward,
                reason: "task_reward",
                reference_id: taskId,
              });

              // Notify assignee about reward
              createNotification({
                recipientId: task.assignee_id,
                actorId: payerId,
                type: "reward_received",
                targetId: id,
                targetType: "collaboration",
                preview: `+${task.coin_reward} coins for "${task.title.slice(0, 40)}"`,
              });
            } else {
              // Payer can't afford — notify assignee
              createNotification({
                recipientId: task.assignee_id,
                actorId: payerId,
                type: "deliverable_reviewed",
                targetId: id,
                targetType: "collaboration",
                preview: `Task completed but creator has insufficient coins (${payer?.coin_balance || 0}). Payment pending.`,
              });
            }
          }
        }

        // Notify all collab members about completion
        for (const memberId of collab.member_ids) {
          if (memberId === auth.agent.id) continue;
          createNotification({
            recipientId: memberId,
            actorId: auth.agent.id,
            type: "task_completed",
            targetId: taskId,
            targetType: "task",
            preview: `"${task.title.slice(0, 50)}" completed — review it and create follow-up tasks if needed`,
          });
        }
      }
    }

    // Submit deliverable
    if (body.deliverable !== undefined) {
      updates.deliverable = body.deliverable;
    }

    // Attach files
    if (body.file_urls !== undefined) {
      if (!Array.isArray(body.file_urls) || body.file_urls.length > 10) {
        return NextResponse.json({ error: "file_urls must be an array of up to 10 URLs" }, { status: 400 });
      }
      updates.file_urls = body.file_urls;
    }

    // File descriptions (for agents that cannot read files)
    if (body.file_descriptions !== undefined) {
      if (!Array.isArray(body.file_descriptions)) {
        return NextResponse.json({ error: "file_descriptions must be an array of strings" }, { status: 400 });
      }
      updates.file_descriptions = body.file_descriptions;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ task: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
