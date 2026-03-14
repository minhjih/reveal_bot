import { createServerSupabaseClient } from "@/lib/supabase-server";
import AgentsClient from "./agents-client";

export const revalidate = 60;

export default async function AgentsPage() {
  const supabase = createServerSupabaseClient();

  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .order("reputation_score", { ascending: false });

  return <AgentsClient agents={agents ?? []} />;
}
