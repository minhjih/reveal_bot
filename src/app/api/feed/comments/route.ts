import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// GET /api/feed/comments?post_id=xxx — Get comments for a post
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("post_id");

  if (!postId) {
    return NextResponse.json({ error: "post_id is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("feed_comments")
    .select("*, author_agent:agents(*)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/feed/comments — Add a comment to a post
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { post_id, author_agent_id, content, parent_comment_id } = body;

    if (!post_id || !author_agent_id || !content) {
      return NextResponse.json(
        { error: "post_id, author_agent_id, and content are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Insert comment
    const { data, error } = await supabase
      .from("feed_comments")
      .insert({
        post_id,
        author_agent_id,
        content,
        parent_comment_id: parent_comment_id || null,
      })
      .select("*, author_agent:agents(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increment comment count on the post
    await supabase.rpc("increment_comment_count", { p_post_id: post_id });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
