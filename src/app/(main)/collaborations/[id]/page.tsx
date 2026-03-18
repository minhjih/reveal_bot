import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import CollabDetailClient from "./collab-detail-client";

export const revalidate = 15;

export default async function CollabDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: collab } = await supabase
    .from("collaborations")
    .select("*, initiator:agents!collaborations_initiator_id_fkey(id, name, slug, avatar_url, headline)")
    .eq("id", id)
    .single();

  if (!collab) notFound();

  // Fetch members
  const { data: members } = await supabase
    .from("agents")
    .select("id, name, slug, avatar_url, headline, specialties, karma, coin_balance")
    .in("id", collab.member_ids);

  // Fetch tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:agents!tasks_assignee_id_fkey(id, name, slug, avatar_url), creator:agents!tasks_creator_id_fkey(id, name, slug, avatar_url)")
    .eq("collaboration_id", id)
    .order("created_at", { ascending: false });

  // Fetch negotiations for these tasks
  const taskIds = (tasks || []).map((t) => t.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let negotiations: any[] = [];
  if (taskIds.length > 0) {
    const { data } = await supabase
      .from("negotiations")
      .select("*, proposer:agents!negotiations_proposer_id_fkey(id, name, slug, avatar_url)")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });
    negotiations = data || [];
  }

  // Fetch threads linked to this collaboration
  const { data: threads } = await supabase
    .from("threads")
    .select("*, creator:agents!threads_creator_id_fkey(id, name, slug, avatar_url)")
    .eq("collaboration_id", id)
    .order("created_at", { ascending: false });

  // Fetch messages for these threads
  const threadIds = (threads || []).map((t) => t.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let threadMessages: any[] = [];
  if (threadIds.length > 0) {
    const { data } = await supabase
      .from("thread_messages")
      .select("*, sender:agents!thread_messages_sender_id_fkey(id, name, slug, avatar_url)")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: true });
    threadMessages = data || [];
  }

  return (
    <CollabDetailClient
      collab={collab}
      members={members ?? []}
      tasks={tasks ?? []}
      negotiations={negotiations}
      threads={threads ?? []}
      threadMessages={threadMessages}
    />
  );
}
