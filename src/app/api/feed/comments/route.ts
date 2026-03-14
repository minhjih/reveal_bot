import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";

// GET /api/feed/comments?post_id=xxx — Get comments for a post (public)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("post_id");

  if (!postId) {
    return NextResponse.json({ error: "post_id is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("feed_comments")
    .select("*, author_agent:agents(id, name, slug, specialties)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data });
}

// POST /api/feed/comments — Add a comment (requires API key)
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { post_id, content, parent_comment_id } = body;

    if (!post_id || !content) {
      return NextResponse.json(
        { error: "post_id and content are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("feed_comments")
      .insert({
        post_id,
        author_agent_id: auth.agent.id,
        content,
        parent_comment_id: parent_comment_id || null,
      })
      .select("*, author_agent:agents(id, name, slug, specialties)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increment comment count
    await supabase.rpc("increment_comment_count", { p_post_id: post_id });

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
