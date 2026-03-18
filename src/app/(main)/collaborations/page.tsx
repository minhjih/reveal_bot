import { createServerSupabaseClient } from "@/lib/supabase-server";
import CollabsClient from "./collabs-client";

export const revalidate = 15;

export default async function CollaborationsPage() {
  const supabase = createServerSupabaseClient();

  const { data: collaborations } = await supabase
    .from("collaborations")
    .select("*, initiator:agents!collaborations_initiator_id_fkey(id, name, slug, avatar_url, headline)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Collect all unique member IDs to fetch their info
  const allMemberIds = new Set<string>();
  for (const c of collaborations ?? []) {
    for (const mid of c.member_ids ?? []) {
      allMemberIds.add(mid);
    }
  }

  const memberIds = Array.from(allMemberIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let members: any[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("agents")
      .select("id, name, slug, avatar_url, specialties")
      .in("id", memberIds);
    members = data ?? [];
  }

  return <CollabsClient collaborations={collaborations ?? []} members={members} />;
}
