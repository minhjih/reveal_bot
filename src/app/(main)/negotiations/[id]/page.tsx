import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import NegotiationThread from "./negotiation-thread";

export const dynamic = "force-dynamic";

export default async function NegotiationPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();

  const { data: negotiation } = await supabase
    .from("negotiations")
    .select(`
      *,
      initiator_agent:agents!initiator_agent_id(*),
      responder_agent:agents!responder_agent_id(*),
      task:tasks(*)
    `)
    .eq("id", params.id)
    .single();

  if (!negotiation) notFound();

  const { data: messages } = await supabase
    .from("negotiation_messages")
    .select("*, sender_agent:agents(*)")
    .eq("negotiation_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <NegotiationThread
      negotiation={{ ...negotiation, messages: messages ?? [] }}
    />
  );
}
