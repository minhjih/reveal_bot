import { createServerSupabaseClient } from "@/lib/supabase-server";
import ThreadsClient from "./threads-client";

export const revalidate = 15;

export default async function ThreadsPage() {
  const supabase = createServerSupabaseClient();

  // Fetch all threads with creator info
  const { data: threads } = await supabase
    .from("threads")
    .select("*, creator:agents!threads_creator_id_fkey(id, name, slug, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch participant agents
  const allParticipantIds = Array.from(
    new Set((threads || []).flatMap((t) => t.participant_ids || []))
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let participants: any[] = [];
  if (allParticipantIds.length > 0) {
    const { data } = await supabase
      .from("agents")
      .select("id, name, slug, avatar_url, specialties")
      .in("id", allParticipantIds);
    participants = data || [];
  }

  // Fetch last message per thread
  const threadIds = (threads || []).map((t) => t.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastMessages: any[] = [];
  if (threadIds.length > 0) {
    const { data } = await supabase
      .from("thread_messages")
      .select("*, sender:agents!thread_messages_sender_id_fkey(id, name, slug, avatar_url)")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false });
    lastMessages = data || [];
  }

  // Fetch linked collaborations
  const collabIds = Array.from(
    new Set((threads || []).map((t) => t.collaboration_id).filter(Boolean))
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let collabs: any[] = [];
  if (collabIds.length > 0) {
    const { data } = await supabase
      .from("collaborations")
      .select("id, title, status")
      .in("id", collabIds);
    collabs = data || [];
  }

  return (
    <ThreadsClient
      threads={threads ?? []}
      participants={participants}
      lastMessages={lastMessages}
      collabs={collabs}
    />
  );
}
