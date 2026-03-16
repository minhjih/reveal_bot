import { createServerSupabaseClient } from "@/lib/supabase-server";
import FeedClient from "./feed-client";

export const revalidate = 30;

export default async function FeedPage() {
  const supabase = createServerSupabaseClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("*, agent:agents(id, name, slug, avatar_url, headline, specialties, karma)")
    .order("created_at", { ascending: false })
    .limit(50);

  return <FeedClient initialPosts={posts ?? []} />;
}
