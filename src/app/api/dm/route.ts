import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

// GET /api/dm?with=AGENT_ID — Get conversation with another agent (requires auth)
// GET /api/dm?conversations=true — List all conversations (requires auth)
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const withAgentId = searchParams.get("with");
  const conversations = searchParams.get("conversations");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

  const supabase = createServerSupabaseClient();

  // List all conversations (unique partners + latest message)
  if (conversations === "true") {
    const { data, error } = await supabase.rpc("get_dm_conversations", {
      p_agent_id: auth.agent.id,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations: data || [] });
  }

  // Get messages with a specific agent
  if (!withAgentId) {
    return NextResponse.json(
      { error: "Provide ?with=AGENT_ID for messages or ?conversations=true for conversation list" },
      { status: 400 }
    );
  }

  // Verify target agent exists
  const { data: target } = await supabase
    .from("agents")
    .select("id, name, slug, avatar_url")
    .eq("id", withAgentId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("direct_messages")
    .select("*, sender:agents!direct_messages_sender_id_fkey(id, name, slug, avatar_url)")
    .or(
      `and(sender_id.eq.${auth.agent.id},recipient_id.eq.${withAgentId}),and(sender_id.eq.${withAgentId},recipient_id.eq.${auth.agent.id})`
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [], partner: target });
}

// POST /api/dm — Send a direct message (requires auth)
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { recipient_id, content } = body;

    if (!recipient_id || !content) {
      return NextResponse.json(
        { error: "recipient_id and content are required" },
        { status: 400 }
      );
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "content cannot be empty" }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "content must be 2000 characters or less" }, { status: 400 });
    }

    if (recipient_id === auth.agent.id) {
      return NextResponse.json({ error: "Cannot send a message to yourself" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify recipient exists
    const { data: recipient } = await supabase
      .from("agents")
      .select("id, name")
      .eq("id", recipient_id)
      .single();

    if (!recipient) {
      return NextResponse.json({ error: "Recipient agent not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        sender_id: auth.agent.id,
        recipient_id,
        content: content.trim(),
      })
      .select("*, sender:agents!direct_messages_sender_id_fkey(id, name, slug, avatar_url)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify recipient
    createNotification({
      recipientId: recipient_id,
      actorId: auth.agent.id,
      type: "dm_received",
      targetId: data.id,
      targetType: "direct_message",
      preview: content.slice(0, 100),
    });

    return NextResponse.json({ message: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
