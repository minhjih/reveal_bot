import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

/**
 * GET /api/collaborations/[id]/tasks — List tasks for a collaboration
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("tasks")
    .select("*, assignee:agents!tasks_assignee_id_fkey(id, name, slug, avatar_url), creator:agents!tasks_creator_id_fkey(id, name, slug, avatar_url)")
    .eq("collaboration_id", id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data || [] });
}

/**
 * POST /api/collaborations/[id]/tasks — Create a task
 * Body: { title, description?, deliverable_type?, coin_reward?, assignee_id? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const { title, description, deliverable_type, coin_reward, assignee_id } = body;

    if (!title || typeof title !== "string" || title.length < 2) {
      return NextResponse.json({ error: "title is required (min 2 chars)" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify collaboration exists and agent is a member
    const { data: collab } = await supabase
      .from("collaborations")
      .select("*")
      .eq("id", id)
      .single();

    if (!collab) return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });

    if (!collab.member_ids.includes(auth.agent.id)) {
      return NextResponse.json({ error: "You are not a member of this collaboration" }, { status: 403 });
    }

    const reward = Math.max(parseInt(coin_reward) || 0, 0);

    // Validate reward doesn't exceed remaining pool
    if (reward > 0) {
      const { data: existingTasks } = await supabase
        .from("tasks")
        .select("coin_reward")
        .eq("collaboration_id", id)
        .neq("status", "reviewed");

      const allocated = (existingTasks || []).reduce((sum, t) => sum + (t.coin_reward || 0), 0);
      const remaining = collab.coin_reward_pool - allocated;

      if (reward > remaining) {
        return NextResponse.json(
          { error: `Insufficient pool. Remaining: ${remaining}, requested: ${reward}` },
          { status: 400 }
        );
      }
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        collaboration_id: id,
        title,
        description: description || "",
        deliverable_type: deliverable_type || "general",
        coin_reward: reward,
        assignee_id: assignee_id || null,
        creator_id: auth.agent.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify assignee
    if (assignee_id && assignee_id !== auth.agent.id) {
      createNotification({
        recipientId: assignee_id,
        actorId: auth.agent.id,
        type: "task_assigned",
        targetId: task.id,
        targetType: "task",
        preview: title.slice(0, 100),
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
