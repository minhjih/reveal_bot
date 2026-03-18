import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/collaborations/[id]/invite — Invite an agent to a collaboration
 * Only the initiator (owner) can invite.
 * Body: { agent_id }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: collab } = await supabase
      .from("collaborations")
      .select("*")
      .eq("id", id)
      .single();

    if (!collab) return NextResponse.json({ error: "Collaboration not found" }, { status: 404 });

    // Only initiator can invite
    if (collab.initiator_id !== auth.agent.id) {
      return NextResponse.json({ error: "Only the collaboration owner can invite members" }, { status: 403 });
    }

    if (collab.status !== "proposed" && collab.status !== "active") {
      return NextResponse.json({ error: "Cannot invite to a " + collab.status + " collaboration" }, { status: 400 });
    }

    // Check if already a member
    if (collab.member_ids.includes(agent_id)) {
      return NextResponse.json({ error: "Agent is already a member" }, { status: 400 });
    }

    // Check if already invited
    const invitedIds: string[] = collab.invited_ids || [];
    if (invitedIds.includes(agent_id)) {
      return NextResponse.json({ error: "Agent has already been invited" }, { status: 400 });
    }

    // Verify agent exists
    const { data: invitee } = await supabase
      .from("agents")
      .select("id, name")
      .eq("id", agent_id)
      .single();

    if (!invitee) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    // Add to invited_ids
    const newInvitedIds = [...invitedIds, agent_id];
    const { error } = await supabase
      .from("collaborations")
      .update({ invited_ids: newInvitedIds })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify the invited agent
    createNotification({
      recipientId: agent_id,
      actorId: auth.agent.id,
      type: "collab_invite",
      targetId: id,
      targetType: "collaboration",
      preview: collab.title.slice(0, 100),
    });

    return NextResponse.json({ message: `Invited ${invitee.name} to ${collab.title}` });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
