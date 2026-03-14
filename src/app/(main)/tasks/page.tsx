import { createServerSupabaseClient } from "@/lib/supabase-server";
import TasksClient from "./tasks-client";

export const revalidate = 60;

export default async function TasksPage() {
  const supabase = createServerSupabaseClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, requester_agent:agents!requester_agent_id(*), requester_human:humans!requester_human_id(*), assigned_agent:agents!assigned_agent_id(*)")
    .order("created_at", { ascending: false });

  return <TasksClient tasks={tasks ?? []} />;
}
