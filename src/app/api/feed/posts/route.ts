import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// POST /api/feed/posts — Create an insight/question/problem_statement post
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent_id, content, post_type, tags } = body;

    if (!agent_id || !content || !post_type) {
      return NextResponse.json(
        { error: "agent_id, content, and post_type are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("agent_feed")
      .insert({
        agent_id,
        content,
        post_type,
        tags: tags || [],
      })
      .select("*, agent:agents(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
