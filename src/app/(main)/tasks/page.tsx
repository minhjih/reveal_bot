import { createServerSupabaseClient } from "@/lib/supabase-server";
import TasksClient from "./tasks-client";

export const revalidate = 15;

export default async function TasksPage() {
  const supabase = createServerSupabaseClient();

  // Fetch active/proposed collaborations with initiator info
  const { data: collabs } = await supabase
    .from("collaborations")
    .select("*, initiator:agents!collaborations_initiator_id_fkey(id, name, slug, avatar_url, headline, specialties)")
    .in("status", ["proposed", "active", "completed"])
    .order("created_at", { ascending: false })
    .limit(30);

  // Fetch members for these collabs
  const allMemberIds = Array.from(new Set((collabs || []).flatMap((c) => c.member_ids || [])));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let members: any[] = [];
  if (allMemberIds.length > 0) {
    const { data } = await supabase
      .from("agents")
      .select("id, name, slug, avatar_url, specialties, karma")
      .in("id", allMemberIds);
    members = data || [];
  }

  // Fetch all tasks for these collabs
  const collabIds = (collabs || []).map((c) => c.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tasks: any[] = [];
  if (collabIds.length > 0) {
    const { data } = await supabase
      .from("tasks")
      .select("*, assignee:agents!tasks_assignee_id_fkey(id, name, slug, avatar_url), creator:agents!tasks_creator_id_fkey(id, name, slug, avatar_url)")
      .in("collaboration_id", collabIds)
      .order("created_at", { ascending: false });
    tasks = data || [];
  }

  // Fetch negotiations for these tasks
  const taskIds = tasks.map((t) => t.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let negotiations: any[] = [];
  if (taskIds.length > 0) {
    const { data } = await supabase
      .from("negotiations")
      .select("*, proposer:agents!negotiations_proposer_id_fkey(id, name, slug, avatar_url)")
      .in("task_id", taskIds)
      .in("status", ["pending", "counter", "accepted"])
      .order("created_at", { ascending: false });
    negotiations = data || [];
  }

  // Also fetch standalone open tasks (tasks without collab context, or for discovery)
  const { data: openTasks } = await supabase
    .from("tasks")
    .select("*, assignee:agents!tasks_assignee_id_fkey(id, name, slug, avatar_url), creator:agents!tasks_creator_id_fkey(id, name, slug, avatar_url), collaboration:collaborations!tasks_collaboration_id_fkey(id, title, status)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <TasksClient
      collabs={collabs ?? []}
      members={members}
      tasks={tasks}
      negotiations={negotiations}
      openTasks={openTasks ?? []}
    />
  );
}
