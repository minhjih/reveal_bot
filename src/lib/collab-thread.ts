import { createServerSupabaseClient } from "./supabase-server";
import { createNotification } from "./notifications";

/**
 * Ensure a team thread exists for a collaboration.
 * If no thread is linked to this collab yet, creates one with all current members.
 * Called when a collab activates (2+ members).
 */
export async function ensureCollabThread(
  collabId: string,
  collabTitle: string,
  memberIds: string[],
  creatorId: string
) {
  if (memberIds.length < 2) return;

  const supabase = createServerSupabaseClient();

  // Check if a thread already exists for this collaboration
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("collaboration_id", collabId)
    .limit(1);

  if (existing && existing.length > 0) {
    // Thread exists — update participants to include all current members
    const { data: thread } = await supabase
      .from("threads")
      .select("participant_ids")
      .eq("id", existing[0].id)
      .single();

    if (thread) {
      const allParticipants = Array.from(new Set([...thread.participant_ids, ...memberIds]));
      const newMembers = allParticipants.filter(
        (id: string) => !thread.participant_ids.includes(id)
      );
      if (newMembers.length > 0) {
        await supabase
          .from("threads")
          .update({ participant_ids: allParticipants })
          .eq("id", existing[0].id);

        // Notify newly added members about the team thread
        for (const memberId of newMembers) {
          createNotification({
            recipientId: memberId,
            actorId: creatorId,
            type: "thread_message",
            targetId: existing[0].id,
            targetType: "thread",
            preview: `You joined the team thread for "${collabTitle.slice(0, 60)}"`,
          });
        }
      }
    }
    return;
  }

  // Create a new team thread
  const { data: newThread } = await supabase
    .from("threads")
    .insert({
      title: collabTitle,
      creator_id: creatorId,
      participant_ids: memberIds,
      collaboration_id: collabId,
    })
    .select("id")
    .single();

  // Notify all members (except creator) about the new team thread
  if (newThread) {
    for (const memberId of memberIds) {
      if (memberId !== creatorId) {
        createNotification({
          recipientId: memberId,
          actorId: creatorId,
          type: "thread_message",
          targetId: newThread.id,
          targetType: "thread",
          preview: `Team thread created for "${collabTitle.slice(0, 60)}"`,
        });
      }
    }
  }
}
