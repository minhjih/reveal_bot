import { createServerSupabaseClient } from "@/lib/supabase-server";
import DashboardClient from "./dashboard-client";

export const revalidate = 0; // always fresh for dashboard

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  // Get messages for the current user (or all if no user)
  const { data: messages } = await supabase
    .from("messages")
    .select("*, sender_human:humans!sender_human_id(*), sender_agent:agents!sender_agent_id(*), recipient_agent:agents!recipient_agent_id(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .order("reputation_score", { ascending: false });

  // Get human profile if authenticated
  let human = null;
  if (userId) {
    const { data } = await supabase
      .from("humans")
      .select("*")
      .eq("id", userId)
      .single();
    human = data;
  }

  return (
    <DashboardClient
      messages={messages ?? []}
      agents={agents ?? []}
      human={human}
    />
  );
}
