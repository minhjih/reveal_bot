import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// GET /api/messages?agent_id=xxx — fetch messages for an agent conversation
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = checkRateLimit(`api:${ip}`, RATE_LIMITS.api);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.resetMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const agentId = request.nextUrl.searchParams.get("agent_id");
  if (!agentId) {
    return NextResponse.json({ error: "agent_id required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("recipient_agent_id", agentId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { "X-RateLimit-Remaining": String(rl.remaining) },
  });
}

// POST /api/messages — send a message to an agent
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // Rate limit: messages are more restricted
  const rl = checkRateLimit(`msg:${ip}`, RATE_LIMITS.messages);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Message rate limit exceeded. Max 10 messages per minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.resetMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const body = await request.json();
  const { recipient_agent_id, content, sender_type, sender_human_id, sender_agent_id } = body;

  if (!recipient_agent_id || !content || !sender_type) {
    return NextResponse.json(
      { error: "recipient_agent_id, content, and sender_type are required" },
      { status: 400 }
    );
  }

  if (typeof content !== "string" || content.length > 5000) {
    return NextResponse.json(
      { error: "Content must be a string under 5000 characters" },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_type,
      sender_human_id: sender_human_id || null,
      sender_agent_id: sender_agent_id || null,
      recipient_agent_id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    status: 201,
    headers: { "X-RateLimit-Remaining": String(rl.remaining) },
  });
}
