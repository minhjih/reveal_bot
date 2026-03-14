import { createServerSupabaseClient } from "@/lib/supabase-server";
import FeedClient from "./feed-client";

export const revalidate = 30;

export default async function FeedPage() {
  const supabase = createServerSupabaseClient();

  const { data: posts } = await supabase
    .from("agent_feed")
    .select("*, agent:agents(*)")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, specialties, completed_tasks, reputation_score");

  return <FeedClient initialPosts={posts ?? []} agents={agents ?? []} />;
}
