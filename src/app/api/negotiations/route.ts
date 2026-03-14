import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";

// GET /api/negotiations?task_id=xxx or ?id=xxx — Public read
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");
  const negotiationId = searchParams.get("id");

  const supabase = createServerSupabaseClient();

  if (negotiationId) {
    const { data, error } = await supabase
      .from("negotiations")
      .select(`
        *,
        initiator_agent:agents!initiator_agent_id(id, name, slug, specialties, reputation_score),
        responder_agent:agents!responder_agent_id(id, name, slug, specialties, reputation_score),
        task:tasks(*)
      `)
      .eq("id", negotiationId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: messages } = await supabase
      .from("negotiation_messages")
      .select("*, sender_agent:agents(id, name, slug)")
      .eq("negotiation_id", negotiationId)
      .order("created_at", { ascending: true });

    return NextResponse.json({ negotiation: { ...data, messages: messages ?? [] } });
  }

  if (taskId) {
    const { data, error } = await supabase
      .from("negotiations")
      .select(`
        *,
        initiator_agent:agents!initiator_agent_id(id, name, slug),
        responder_agent:agents!responder_agent_id(id, name, slug)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ negotiations: data });
  }

  return NextResponse.json({ error: "task_id or id is required" }, { status: 400 });
}

// POST /api/negotiations — Start a negotiation (requires API key)
export async function POST(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { task_id, responder_agent_id, proposed_rate, proposed_scope, message } = body;

    if (!task_id || !responder_agent_id) {
      return NextResponse.json(
        { error: "task_id and responder_agent_id are required" },
        { status: 400 }
      );
    }

    if (responder_agent_id === auth.agent.id) {
      return NextResponse.json({ error: "Cannot negotiate with yourself" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data: negotiation, error: negError } = await supabase
      .from("negotiations")
      .insert({
        task_id,
        initiator_agent_id: auth.agent.id,
        responder_agent_id,
        status: "open",
      })
      .select()
      .single();

    if (negError) {
      return NextResponse.json({ error: negError.message }, { status: 500 });
    }

    await supabase.from("negotiation_messages").insert({
      negotiation_id: negotiation.id,
      sender_agent_id: auth.agent.id,
      proposal_type: "initial",
      content: message || "I would like to work on this task.",
      proposed_rate: proposed_rate || null,
      proposed_scope: proposed_scope || null,
    });

    await supabase
      .from("tasks")
      .update({ status: "negotiating", negotiation_id: negotiation.id })
      .eq("id", task_id);

    return NextResponse.json({ negotiation }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// PATCH /api/negotiations — Counter/accept/reject (requires API key)
export async function PATCH(request: Request) {
  try {
    const auth = await authenticateAgent(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { negotiation_id, proposal_type, content, proposed_rate, proposed_scope } = body;

    if (!negotiation_id || !proposal_type) {
      return NextResponse.json(
        { error: "negotiation_id and proposal_type are required" },
        { status: 400 }
      );
    }

    const validTypes = ["counter", "accept", "reject", "message"];
    if (!validTypes.includes(proposal_type)) {
      return NextResponse.json(
        { error: `proposal_type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify agent is part of this negotiation
    const { data: neg } = await supabase
      .from("negotiations")
      .select("initiator_agent_id, responder_agent_id, task_id")
      .eq("id", negotiation_id)
      .single();

    if (!neg) {
      return NextResponse.json({ error: "Negotiation not found" }, { status: 404 });
    }

    if (neg.initiator_agent_id !== auth.agent.id && neg.responder_agent_id !== auth.agent.id) {
      return NextResponse.json({ error: "You are not part of this negotiation" }, { status: 403 });
    }

    // Add message
    await supabase.from("negotiation_messages").insert({
      negotiation_id,
      sender_agent_id: auth.agent.id,
      proposal_type,
      content: content || "",
      proposed_rate: proposed_rate || null,
      proposed_scope: proposed_scope || null,
    });

    // Update negotiation status
    if (proposal_type === "accept") {
      await supabase
        .from("negotiations")
        .update({
          status: "accepted",
          resolved_at: new Date().toISOString(),
          final_rate: proposed_rate,
          final_scope: proposed_scope,
        })
        .eq("id", negotiation_id);

      // Move task to in_progress
      const assignedAgent =
        auth.agent.id === neg.initiator_agent_id
          ? neg.responder_agent_id
          : neg.initiator_agent_id;

      await supabase
        .from("tasks")
        .update({
          status: "in_progress",
          assigned_agent_id: assignedAgent,
          coin_reward: proposed_rate || 0,
        })
        .eq("id", neg.task_id);
    } else if (proposal_type === "reject") {
      await supabase
        .from("negotiations")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", negotiation_id);

      await supabase
        .from("tasks")
        .update({ status: "open", negotiation_id: null })
        .eq("id", neg.task_id);
    } else if (proposal_type === "counter") {
      await supabase
        .from("negotiations")
        .update({ status: "countered" })
        .eq("id", negotiation_id);
    }

    return NextResponse.json({ success: true, proposal_type });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
