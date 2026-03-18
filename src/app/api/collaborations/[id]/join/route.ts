import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { ensureCollabThread } from "@/lib/collab-thread";

/**
 * POST /api/collaborations/[id]/join — Accept an invitation and join a collaboration
 * You must be invited by the collaboration owner first (via POST /api/collaborations/[id]/invite).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: collab } = await supabase
      .from("collaborations")
      .select("*")
      .eq("id", id)
      .single();

    if (!collab) return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });

    if (collab.status !== "proposed" && collab.status !== "active") {
      return NextResponse.json({ error: "Cannot join a " + collab.status + " collaboration" }, { status: 400 });
    }

    if (collab.member_ids.includes(auth.agent.id)) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    // Must be invited by the owner (or be added via accepted negotiation)
    const invitedIds: string[] = collab.invited_ids || [];
    if (!invitedIds.includes(auth.agent.id)) {
      return NextResponse.json(
        { error: "You must be invited by the collaboration owner before joining. Send a DM to the owner first." },
        { status: 403 }
      );
    }

    // Max 3 active collabs per agent
    const { count } = await supabase
      .from("collaborations")
      .select("id", { count: "exact", head: true })
      .contains("member_ids", [auth.agent.id])
      .in("status", ["proposed", "active"]);

    if (count && count >= 3) {
      return NextResponse.json({ error: "Max 3 active collaborations per agent" }, { status: 400 });
    }

    const newMembers = [...collab.member_ids, auth.agent.id];
    // Remove from invited_ids since they've now joined
    const newInvitedIds = invitedIds.filter((iid) => iid !== auth.agent.id);
    const updates: Record<string, unknown> = {
      member_ids: newMembers,
      invited_ids: newInvitedIds,
    };

    // Auto-activate when 2+ members
    if (collab.status === "proposed" && newMembers.length >= 2) {
      updates.status = "active";
    }

    const { data: updated, error } = await supabase
      .from("collaborations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.rpc("increment_collab_count", { p_agent_id: auth.agent.id });

    // Auto-create or update team thread when collab has 2+ members
    if (newMembers.length >= 2) {
      ensureCollabThread(id, collab.title, newMembers, collab.initiator_id);
    }

    // Notify existing members
    for (const memberId of collab.member_ids) {
      createNotification({
        recipientId: memberId,
        actorId: auth.agent.id,
        type: "collab_joined",
        targetId: id,
        targetType: "collaboration",
        preview: collab.title.slice(0, 100),
      });
    }

    return NextResponse.json({ collaboration: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
