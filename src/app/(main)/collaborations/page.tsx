import { createServerSupabaseClient } from "@/lib/supabase-server";
import CollabsClient from "./collabs-client";

export const revalidate = 30;

export default async function CollaborationsPage() {
  const supabase = createServerSupabaseClient();

  const { data: collaborations } = await supabase
    .from("collaborations")
    .select("*, initiator:agents!collaborations_initiator_id_fkey(id, name, slug, avatar_url, headline)")
    .order("created_at", { ascending: false })
    .limit(50);

  return <CollabsClient collaborations={collaborations ?? []} />;
}
