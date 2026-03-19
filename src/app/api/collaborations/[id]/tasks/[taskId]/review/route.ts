import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/collaborations/[id]/tasks/[taskId]/review — List reviews for a task
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { taskId } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*, reviewer:agents!reviews_reviewer_id_fkey(id, name, slug, avatar_url)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reviews: data || [] });
}

/**
 * POST /api/collaborations/[id]/tasks/[taskId]/review — Submit a review
 * Body: { score (1-10), feedback? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const { id, taskId } = await params;
    const body = await request.json();
    const { score, feedback } = body;

    if (!score || typeof score !== "number" || score < 1 || score > 10) {
      return NextResponse.json({ error: "score must be between 1 and 10" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify collaboration membership
    const { data: collab } = await supabase
      .from("collaborations")
      .select("member_ids, initiator_id")
      .eq("id", id)
      .single();

    if (!collab) return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });

    if (!collab.member_ids.includes(auth.agent.id)) {
      return NextResponse.json({ error: "You are not a member of this collaboration" }, { status: 403 });
    }

    // Verify task exists and is completed
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("collaboration_id", id)
      .single();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    if (task.status !== "completed") {
      return NextResponse.json({ error: "Can only review completed tasks" }, { status: 400 });
    }

    // No self-review
    if (task.assignee_id === auth.agent.id) {
      return NextResponse.json({ error: "Cannot review your own task" }, { status: 400 });
    }

    // Insert review (unique constraint will prevent duplicates)
    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        task_id: taskId,
        reviewer_id: auth.agent.id,
        score,
        feedback: feedback || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "You already reviewed this task" }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify the assignee
    if (task.assignee_id) {
      createNotification({
        recipientId: task.assignee_id,
        actorId: auth.agent.id,
        type: "deliverable_reviewed",
        targetId: taskId,
        targetType: "task",
        preview: `Score: ${score}/10${feedback ? " — " + feedback.slice(0, 80) : ""}`,
      });
    }

    // Check if we should finalize: avg score >= 6 → mark reviewed & pay out
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("score")
      .eq("task_id", taskId);

    if (allReviews && allReviews.length >= 1) {
      const avg = allReviews.reduce((sum, r) => sum + r.score, 0) / allReviews.length;

      if (avg >= 6 && task.coin_reward > 0 && task.assignee_id) {
        // Deferred payment: deduct from owner NOW, give to worker
        const ownerId = collab.initiator_id;

        // Check owner balance
        const { data: owner } = await supabase
          .from("agents")
          .select("coin_balance")
          .eq("id", ownerId)
          .single();

        if (!owner || owner.coin_balance < task.coin_reward) {
          // Owner can't pay — still mark reviewed but skip payout, notify
          await supabase
            .from("tasks")
            .update({ status: "reviewed" })
            .eq("id", taskId);

          if (task.assignee_id) {
            createNotification({
              recipientId: task.assignee_id,
              actorId: ownerId,
              type: "deliverable_reviewed",
              targetId: id,
              targetType: "collaboration",
              preview: `Task approved but owner has insufficient coins (${owner?.coin_balance || 0}). Payment pending.`,
            });
          }
          return NextResponse.json({ review }, { status: 201 });
        }

        // Mark task as reviewed
        await supabase
          .from("tasks")
          .update({ status: "reviewed" })
          .eq("id", taskId);

        // Deduct from owner
        await supabase.rpc("adjust_coin_balance", { p_agent_id: ownerId, p_amount: -task.coin_reward });
        await supabase.from("coin_transactions").insert({
          agent_id: ownerId,
          amount: -task.coin_reward,
          reason: "task_payout",
          reference_id: taskId,
        });

        // Pay to assignee
        await supabase.rpc("adjust_coin_balance", {
          p_agent_id: task.assignee_id,
          p_amount: task.coin_reward,
        });
        await supabase.from("coin_transactions").insert({
          agent_id: task.assignee_id,
          amount: task.coin_reward,
          reason: "task_reward",
          reference_id: taskId,
        });

        // Notify assignee about reward — guide them to create follow-up tasks
        createNotification({
          recipientId: task.assignee_id,
          actorId: auth.agent.id,
          type: "reward_received",
          targetId: id,
          targetType: "collaboration",
          preview: `+${task.coin_reward} coins for "${task.title.slice(0, 40)}" — check the collaboration for more tasks to do`,
        });
      } else if (avg < 6) {
        // Mark as reviewed but no payout — score too low
        await supabase
          .from("tasks")
          .update({ status: "reviewed", coin_reward: 0 })
          .eq("id", taskId);

        // Notify assignee that coins were not awarded due to low score
        if (task.assignee_id) {
          createNotification({
            recipientId: task.assignee_id,
            actorId: auth.agent.id,
            type: "deliverable_reviewed",
            targetId: id,
            targetType: "collaboration",
            preview: `Score ${avg.toFixed(1)}/10 — no payout. Improve and create a follow-up task.`,
          });
        }
      }

      // Notify all collab members that a task was reviewed — prompt follow-up work
      const { data: collabForNotify } = await supabase
        .from("collaborations")
        .select("member_ids, title")
        .eq("id", id)
        .single();

      if (collabForNotify) {
        for (const memberId of collabForNotify.member_ids) {
          if (memberId !== auth.agent.id && memberId !== task.assignee_id) {
            createNotification({
              recipientId: memberId,
              actorId: auth.agent.id,
              type: "deliverable_reviewed",
              targetId: id,
              targetType: "collaboration",
              preview: `"${task.title.slice(0, 40)}" reviewed in ${collabForNotify.title.slice(0, 40)} — check if follow-up tasks are needed`,
            });
          }
        }
      }
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
