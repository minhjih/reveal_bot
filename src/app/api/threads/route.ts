import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

// GET /api/threads — List threads I'm part of (requires auth)
// Query: ?collaboration_id=UUID — filter by collab
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const collaborationId = searchParams.get("collaboration_id");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("threads")
    .select("*, creator:agents!threads_creator_id_fkey(id, name, slug, avatar_url)")
    .contains("participant_ids", [auth.agent.id])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (collaborationId) {
    query = query.eq("collaboration_id", collaborationId);
  }

  const { data: threads, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch last message for each thread
  const threadIds = (threads || []).map((t: { id: string }) => t.id);
  const lastMessages: Record<string, unknown> = {};

  if (threadIds.length > 0) {
    const { data: msgs } = await supabase
      .from("thread_messages")
      .select("*, sender:agents!thread_messages_sender_id_fkey(id, name, slug, avatar_url)")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false });

    // Group by thread_id, take first (latest) per thread
    const seen = new Set<string>();
    for (const msg of msgs || []) {
      const m = msg as { thread_id: string };
      if (!seen.has(m.thread_id)) {
        seen.add(m.thread_id);
        lastMessages[m.thread_id] = msg;
      }
    }
  }

  const enriched = (threads || []).map((t: { id: string }) => ({
    ...t,
    last_message: lastMessages[t.id] || null,
  }));

  return NextResponse.json({ threads: enriched });
}

// POST /api/threads — Create a new thread (requires auth)
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { title, participant_ids, collaboration_id } = body;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json(
        { error: "participant_ids is required (at least one other agent)" },
        { status: 400 }
      );
    }

    // Ensure creator is included in participants
    const allParticipants = Array.from(new Set([auth.agent.id, ...participant_ids]));

    if (allParticipants.length < 2) {
      return NextResponse.json(
        { error: "A thread needs at least 2 participants" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify all participants exist
    const { data: agents } = await supabase
      .from("agents")
      .select("id")
      .in("id", allParticipants);

    if (!agents || agents.length !== allParticipants.length) {
      return NextResponse.json({ error: "One or more participant agents not found" }, { status: 404 });
    }

    // If collaboration_id provided, verify it exists and creator is a member
    if (collaboration_id) {
      const { data: collab } = await supabase
        .from("collaborations")
        .select("id, member_ids")
        .eq("id", collaboration_id)
        .single();

      if (!collab) {
        return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });
      }
    }

    const { data, error } = await supabase
      .from("threads")
      .insert({
        title: title || null,
        creator_id: auth.agent.id,
        participant_ids: allParticipants,
        collaboration_id: collaboration_id || null,
      })
      .select("*, creator:agents!threads_creator_id_fkey(id, name, slug, avatar_url)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify other participants
    for (const pid of allParticipants) {
      if (pid !== auth.agent.id) {
        createNotification({
          recipientId: pid,
          actorId: auth.agent.id,
          type: "thread_message",
          targetId: data.id,
          targetType: "thread",
          preview: title ? `New thread: ${title.slice(0, 80)}` : "You were added to a new thread",
        });
      }
    }

    return NextResponse.json({ thread: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// PATCH /api/threads — Update thread (add participants, change title)
export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { thread_id, title, add_participant_ids } = body;

    if (!thread_id) {
      return NextResponse.json({ error: "thread_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: thread } = await supabase
      .from("threads")
      .select("*")
      .eq("id", thread_id)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (!thread.participant_ids.includes(auth.agent.id)) {
      return NextResponse.json({ error: "You are not a participant in this thread" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};

    if (title !== undefined) {
      updates.title = title;
    }

    if (add_participant_ids && Array.isArray(add_participant_ids)) {
      const newParticipants = Array.from(new Set([...thread.participant_ids, ...add_participant_ids]));
      updates.participant_ids = newParticipants;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("threads")
      .update(updates)
      .eq("id", thread_id)
      .select("*, creator:agents!threads_creator_id_fkey(id, name, slug, avatar_url)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ thread: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
