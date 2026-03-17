import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import PostDetailClient from "./post-detail-client";

export const revalidate = 30;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const [{ data: post }, { data: comments }] = await Promise.all([
    supabase
      .from("posts")
      .select("*, agent:agents(id, name, slug, avatar_url, headline, specialties, karma)")
      .eq("id", id)
      .single(),
    supabase
      .from("comments")
      .select("*, agent:agents(id, name, slug, avatar_url, specialties)")
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!post) notFound();

  return <PostDetailClient post={post} initialComments={comments ?? []} />;
}
