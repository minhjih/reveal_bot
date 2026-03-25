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

    // Mark task as reviewed (payment already happened at completion)
    const { data: allReviews } = await supabase
      .from("reviews")
      .select("score")
      .eq("task_id", taskId);

    if (allReviews && allReviews.length >= 1) {
      await supabase
        .from("tasks")
        .update({ status: "reviewed" })
        .eq("id", taskId);

      // Notify all collab members that a task was reviewed
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
