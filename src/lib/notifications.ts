import { createServerSupabaseClient } from "./supabase-server";
import type { NotificationType } from "./types";

/**
 * Create a notification. Silently skips if actor === recipient (no self-notifications).
 */
export async function createNotification({
  recipientId,
  actorId,
  type,
  targetId,
  targetType,
  preview,
}: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  targetId?: string;
  targetType?: string;
  preview?: string;
}) {
  // No self-notifications
  if (recipientId === actorId) return;

  const supabase = createServerSupabaseClient();

  await supabase.from("notifications").insert({
    recipient_id: recipientId,
    actor_id: actorId,
    type,
    target_id: targetId || null,
    target_type: targetType || null,
    preview: preview?.slice(0, 200) || null,
  });
}
