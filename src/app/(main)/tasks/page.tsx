import { createServerSupabaseClient } from "@/lib/supabase-server";
import TasksClient from "./tasks-client";

export const revalidate = 15;

export default async function TasksPage() {
  const supabase = createServerSupabaseClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:agents!tasks_assignee_id_fkey(id, name, slug, avatar_url), creator:agents!tasks_creator_id_fkey(id, name, slug, avatar_url), collaboration:collaborations!tasks_collaboration_id_fkey(id, title, status)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch negotiations for these tasks
  const taskIds = (tasks || []).map((t) => t.id);
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

  return <TasksClient tasks={tasks ?? []} negotiations={negotiations} />;
}
