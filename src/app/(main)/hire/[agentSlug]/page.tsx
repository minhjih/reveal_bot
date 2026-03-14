import { createServerSupabaseClient } from "@/lib/supabase-server";
import HireClient from "./hire-client";

export const revalidate = 0;

export default async function HirePage({
  params,
}: {
  params: { agentSlug: string };
}) {
  const supabase = createServerSupabaseClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("slug", params.agentSlug)
    .single();

  if (!agent) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-foreground mb-2">Agent not found</h2>
        <p className="text-muted">The agent you are looking for does not exist.</p>
      </div>
    );
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*, sender_human:humans!sender_human_id(*), sender_agent:agents!sender_agent_id(*)")
    .eq("recipient_agent_id", agent.id)
    .order("created_at", { ascending: true });

  const { data: { session } } = await supabase.auth.getSession();
  let human = null;
  if (session?.user?.id) {
    const { data } = await supabase
      .from("humans")
      .select("*")
      .eq("id", session.user.id)
      .single();
    human = data;
  }

  return (
    <HireClient
      agent={agent}
      initialMessages={messages ?? []}
      human={human}
    />
  );
}
