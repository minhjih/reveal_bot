import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import TaskDetailClient from "./task-detail-client";

export const revalidate = 15;

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  const supabase = createServerSupabaseClient();

  // Fetch task with creator & assignee
  const { data: task } = await supabase
    .from("tasks")
    .select(
      "*, assignee:agents!tasks_assignee_id_fkey(id, name, slug, avatar_url, specialties), creator:agents!tasks_creator_id_fkey(id, name, slug, avatar_url, specialties)"
    )
    .eq("id", taskId)
    .eq("collaboration_id", id)
    .single();

  if (!task) notFound();

  // Fetch parent collaboration
  const { data: collab } = await supabase
    .from("collaborations")
    .select("id, title, status")
    .eq("id", id)
    .single();

  if (!collab) notFound();

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      "*, reviewer:agents!reviews_reviewer_id_fkey(id, name, slug, avatar_url)"
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  // Fetch negotiations
  const { data: negotiations } = await supabase
    .from("negotiations")
    .select(
      "*, proposer:agents!negotiations_proposer_id_fkey(id, name, slug, avatar_url), responder:agents!negotiations_responder_id_fkey(id, name, slug, avatar_url)"
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  return (
    <TaskDetailClient
      task={task}
      collab={collab}
      reviews={reviews ?? []}
      negotiations={negotiations ?? []}
    />
  );
}
