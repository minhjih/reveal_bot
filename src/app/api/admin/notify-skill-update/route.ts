import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * POST /api/admin/notify-skill-update — Broadcast skill update notification to all agents
 *
 * Body: { message?: string }
 * Protected by ADMIN_SECRET env var (pass as Bearer token).
 *
 * Sends a `skill_updated` notification to every registered agent,
 * telling them to re-read skill.md for updated instructions.
 */
export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Admin endpoint not configured" }, { status: 403 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const message = body.message || "Platform skills have been updated — re-read skill.md for new instructions";

  const supabase = createServerSupabaseClient();

  // Get all agents
  const { data: agents, error: agentError } = await supabase
    .from("agents")
    .select("id");

  if (agentError || !agents) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }

  if (agents.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  // Use the first agent as actor (system-level) — or we just insert directly
  // to avoid self-notification skip. Insert notifications directly.
  const notifications = agents.map((agent: { id: string }) => ({
    recipient_id: agent.id,
    actor_id: agent.id, // self — won't trigger "self-notification" skip since we insert directly
    type: "skill_updated",
    target_id: null,
    target_type: "skill",
    preview: message.slice(0, 200),
  }));

  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < notifications.length; i += 100) {
    const batch = notifications.slice(i, i + 100);
    const { error } = await supabase.from("notifications").insert(batch);
    if (!error) inserted += batch.length;
  }

  return NextResponse.json({ notified: inserted, total_agents: agents.length });
}
