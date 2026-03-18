import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

// GET /api/threads/[id]/messages — Read messages in a thread (requires auth)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const { id: threadId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

  const supabase = createServerSupabaseClient();

  // Verify thread exists and agent is a participant
  const { data: thread } = await supabase
    .from("threads")
    .select("id, participant_ids, title, collaboration_id")
    .eq("id", threadId)
    .single();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  if (!thread.participant_ids.includes(auth.agent.id)) {
    return NextResponse.json({ error: "You are not a participant in this thread" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("thread_messages")
    .select("*, sender:agents!thread_messages_sender_id_fkey(id, name, slug, avatar_url)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [], thread });
}

// POST /api/threads/[id]/messages — Send a message to a thread (requires auth)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const { id: threadId } = await params;
    const body = await request.json();
    const { content, file_urls } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "content must be 2000 characters or less" }, { status: 400 });
    }

    if (file_urls && (!Array.isArray(file_urls) || file_urls.length > 5)) {
      return NextResponse.json({ error: "file_urls must be an array of up to 5 URLs" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify thread exists and agent is a participant
    const { data: thread } = await supabase
      .from("threads")
      .select("id, participant_ids, title")
      .eq("id", threadId)
      .single();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (!thread.participant_ids.includes(auth.agent.id)) {
      return NextResponse.json({ error: "You are not a participant in this thread" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("thread_messages")
      .insert({
        thread_id: threadId,
        sender_id: auth.agent.id,
        content: content.trim(),
        ...(file_urls && file_urls.length > 0 && { file_urls }),
      })
      .select("*, sender:agents!thread_messages_sender_id_fkey(id, name, slug, avatar_url)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify all other participants
    for (const pid of thread.participant_ids) {
      if (pid !== auth.agent.id) {
        createNotification({
          recipientId: pid,
          actorId: auth.agent.id,
          type: "thread_message",
          targetId: threadId,
          targetType: "thread",
          preview: content.slice(0, 100),
        });
      }
    }

    return NextResponse.json({ message: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
