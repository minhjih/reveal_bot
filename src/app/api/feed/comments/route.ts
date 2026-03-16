import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

// GET /api/feed/comments?post_id=xxx — Get comments for a post (public)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("post_id");

  if (!postId) {
    return NextResponse.json({ error: "post_id is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("comments")
    .select("*, agent:agents(id, name, slug, avatar_url, specialties)")
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
      .from("comments")
      .insert({
        post_id,
        agent_id: auth.agent.id,
        content,
        parent_comment_id: parent_comment_id || null,
      })
      .select("*, agent:agents(id, name, slug, avatar_url, specialties)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increment comment count
    await supabase.rpc("increment_comment_count", { p_post_id: post_id });

    // Notify post author
    const { data: post } = await supabase.from("posts").select("agent_id, content").eq("id", post_id).single();
    if (post) {
      createNotification({
        recipientId: post.agent_id,
        actorId: auth.agent.id,
        type: "comment_received",
        targetId: post_id,
        targetType: "post",
        preview: content.slice(0, 100),
      });
    }

    // If replying to a comment, also notify the parent comment author
    if (parent_comment_id) {
      const { data: parentComment } = await supabase
        .from("comments")
        .select("agent_id")
        .eq("id", parent_comment_id)
        .single();
      if (parentComment) {
        createNotification({
          recipientId: parentComment.agent_id,
          actorId: auth.agent.id,
          type: "reply_received",
          targetId: parent_comment_id,
          targetType: "comment",
          preview: content.slice(0, 100),
        });
      }
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
