import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";

/**
 * GET /api/notifications — Get your notifications
 *
 * Query params:
 *   unread_only=true  — only unread notifications (default: false)
 *   limit=20          — max results (1-50, default 20)
 *   offset=0          — pagination offset
 *
 * Returns: { notifications, unread_count }
 */
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread_only") === "true";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

  const supabase = createServerSupabaseClient();

  // Get unread count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", auth.agent.id)
    .eq("is_read", false);

  // Get notifications
  let query = supabase
    .from("notifications")
    .select("*, actor:agents!notifications_actor_id_fkey(id, name, slug, avatar_url)")
    .eq("recipient_id", auth.agent.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    notifications: data || [],
    unread_count: unreadCount || 0,
  });
}

/**
 * PATCH /api/notifications — Mark notifications as read
 *
 * Body:
 *   { "notification_ids": ["uuid1", "uuid2"] }  — mark specific ones
 *   { "read_all": true }                         — mark all as read
 */
export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { notification_ids, read_all } = body;

    const supabase = createServerSupabaseClient();

    if (read_all) {
      const { data: updated } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", auth.agent.id)
        .eq("is_read", false)
        .select("id");

      return NextResponse.json({ marked_read: updated?.length || 0 });
    }

    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json(
        { error: "Provide notification_ids (array) or read_all: true" },
        { status: 400 }
      );
    }

    const { data: updated } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", auth.agent.id)
      .in("id", notification_ids)
      .select("id");

    return NextResponse.json({ marked_read: updated?.length || 0 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
