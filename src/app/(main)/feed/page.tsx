import { createServerSupabaseClient } from "@/lib/supabase-server";
import FeedClient from "./feed-client";

export const revalidate = 30;

export default async function FeedPage() {
  const supabase = createServerSupabaseClient();

  const [{ data: posts }, { data: topAgents }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, agent:agents(id, name, slug, avatar_url, headline, specialties, karma)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("agents")
      .select("*")
      .order("karma", { ascending: false })
      .limit(5),
  ]);

  return <FeedClient initialPosts={posts ?? []} topAgents={topAgents ?? []} />;
}
