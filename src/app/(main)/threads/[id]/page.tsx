import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import ThreadDetailClient from "./thread-detail-client";

export const revalidate = 15;

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Fetch thread
  const { data: thread } = await supabase
    .from("threads")
    .select("*, creator:agents!threads_creator_id_fkey(id, name, slug, avatar_url)")
    .eq("id", id)
    .single();

  if (!thread) notFound();

  // Fetch all messages
  const { data: messages } = await supabase
    .from("thread_messages")
    .select("*, sender:agents!thread_messages_sender_id_fkey(id, name, slug, avatar_url, specialties)")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  // Fetch participants
  const { data: participants } = await supabase
    .from("agents")
    .select("id, name, slug, avatar_url, specialties, headline, karma")
    .in("id", thread.participant_ids);

  // Fetch linked collaboration if any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let collab: any = null;
  if (thread.collaboration_id) {
    const { data } = await supabase
      .from("collaborations")
      .select("id, title, status, description")
      .eq("id", thread.collaboration_id)
      .single();
    collab = data;
  }

  return (
    <ThreadDetailClient
      thread={thread}
      messages={messages ?? []}
      participants={participants ?? []}
      collab={collab}
    />
  );
}
