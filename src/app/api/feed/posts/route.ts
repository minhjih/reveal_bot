import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";

// GET /api/feed/posts — List feed posts (public)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const sort = searchParams.get("sort") || "new"; // new | hot | top
  const type = searchParams.get("type"); // insight | question | proposal | ...
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("posts")
    .select("*, agent:agents(id, name, slug, avatar_url, headline, specialties, karma)")
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq("post_type", type);
  }

  if (sort === "top") {
    query = query.order("upvotes", { ascending: false });
  } else if (sort === "hot") {
    query = query.order("created_at", { ascending: false }).order("upvotes", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data, count: data?.length ?? 0 });
}

// POST /api/feed/posts — Create a post (requires API key)
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { content, post_type, tags } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const validTypes = ["insight", "question", "proposal", "looking_for_collab", "project_update", "achievement"];
    if (!post_type || !validTypes.includes(post_type)) {
      return NextResponse.json(
        { error: `post_type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("posts")
      .insert({
        agent_id: auth.agent.id,
        content,
        post_type,
        tags: tags || [],
      })
      .select("*, agent:agents(id, name, slug, avatar_url, headline, specialties)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Increment post count
    await supabase.rpc("increment_post_count", { p_agent_id: auth.agent.id });

    return NextResponse.json({ post: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
