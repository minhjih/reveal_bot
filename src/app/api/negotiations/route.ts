import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// GET /api/negotiations?task_id=xxx — Get negotiations for a task
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("task_id");
  const negotiationId = searchParams.get("id");

  const supabase = createServerSupabaseClient();

  if (negotiationId) {
    // Get single negotiation with messages
    const { data, error } = await supabase
      .from("negotiations")
      .select(`
        *,
        initiator_agent:agents!initiator_agent_id(*),
        responder_agent:agents!responder_agent_id(*),
        task:tasks(*)
      `)
      .eq("id", negotiationId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get messages for this negotiation
    const { data: messages } = await supabase
      .from("negotiation_messages")
      .select("*, sender_agent:agents(*)")
      .eq("negotiation_id", negotiationId)
      .order("created_at", { ascending: true });

    return NextResponse.json({ data: { ...data, messages: messages ?? [] } });
  }

  if (taskId) {
    const { data, error } = await supabase
      .from("negotiations")
      .select(`
        *,
        initiator_agent:agents!initiator_agent_id(*),
        responder_agent:agents!responder_agent_id(*)
      `)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: "task_id or id is required" }, { status: 400 });
}

// POST /api/negotiations — Start a negotiation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task_id, initiator_agent_id, responder_agent_id, proposed_rate, proposed_scope, message } = body;

    if (!task_id || !initiator_agent_id || !responder_agent_id) {
      return NextResponse.json(
        { error: "task_id, initiator_agent_id, and responder_agent_id are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Create negotiation
    const { data: negotiation, error: negError } = await supabase
      .from("negotiations")
      .insert({
        task_id,
        initiator_agent_id,
        responder_agent_id,
        status: "open",
      })
      .select()
      .single();

    if (negError) {
      return NextResponse.json({ error: negError.message }, { status: 500 });
    }

    // Add initial proposal message
    const { error: msgError } = await supabase
      .from("negotiation_messages")
      .insert({
        negotiation_id: negotiation.id,
        sender_agent_id: initiator_agent_id,
        proposal_type: "initial",
        content: message || "I would like to work on this task.",
        proposed_rate: proposed_rate || null,
        proposed_scope: proposed_scope || null,
      });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // Update task status to negotiating
    await supabase
      .from("tasks")
      .update({ status: "negotiating", negotiation_id: negotiation.id })
      .eq("id", task_id);

    return NextResponse.json({ data: negotiation });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PATCH /api/negotiations — Send counter/accept/reject
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { negotiation_id, sender_agent_id, proposal_type, content, proposed_rate, proposed_scope } = body;

    if (!negotiation_id || !sender_agent_id || !proposal_type) {
      return NextResponse.json(
        { error: "negotiation_id, sender_agent_id, and proposal_type are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Add message
    await supabase.from("negotiation_messages").insert({
      negotiation_id,
      sender_agent_id,
      proposal_type,
      content: content || "",
      proposed_rate: proposed_rate || null,
      proposed_scope: proposed_scope || null,
    });

    // Update negotiation status
    if (proposal_type === "accept") {
      const { data: negotiation } = await supabase
        .from("negotiations")
        .update({
          status: "accepted",
          resolved_at: new Date().toISOString(),
          final_rate: proposed_rate,
          final_scope: proposed_scope,
        })
        .eq("id", negotiation_id)
        .select("task_id, responder_agent_id, initiator_agent_id")
        .single();

      // Move task to in_progress and assign agent
      if (negotiation) {
        const assignedAgent =
          sender_agent_id === negotiation.initiator_agent_id
            ? negotiation.responder_agent_id
            : negotiation.initiator_agent_id;

        await supabase
          .from("tasks")
          .update({
            status: "in_progress",
            assigned_agent_id: assignedAgent,
            coin_reward: proposed_rate || 0,
          })
          .eq("id", negotiation.task_id);
      }
    } else if (proposal_type === "reject") {
      const { data: negotiation } = await supabase
        .from("negotiations")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", negotiation_id)
        .select("task_id")
        .single();

      // Reopen task
      if (negotiation) {
        await supabase
          .from("tasks")
          .update({ status: "open", negotiation_id: null })
          .eq("id", negotiation.task_id);
      }
    } else if (proposal_type === "counter") {
      await supabase
        .from("negotiations")
        .update({ status: "countered" })
        .eq("id", negotiation_id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
