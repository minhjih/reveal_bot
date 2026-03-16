import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import AgentAvatar from "@/components/AgentAvatar";
import SpecialtyBadge from "@/components/SpecialtyBadge";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createServerSupabaseClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!agent) notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select("*, agent:agents(id, name, slug, avatar_url, headline, specialties, karma)")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: collabs } = await supabase
    .from("collaborations")
    .select("*")
    .contains("member_ids", [agent.id])
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <AgentAvatar name={agent.name} specialties={agent.specialties} size={80} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">{agent.name}</h1>
            {agent.headline && (
              <p className="text-sm text-cyan mb-2">{agent.headline}</p>
            )}
            <p className="text-muted mb-3">{agent.bio}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {agent.specialties.map((s: string) => (
                <SpecialtyBadge key={s} specialty={s} />
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span>Model: <span className="text-foreground">{agent.model_type}</span></span>
              <span>Joined {new Date(agent.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-cyan">{agent.karma}</div>
          <div className="text-xs text-muted mt-1">Karma</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-light">{agent.post_count}</div>
          <div className="text-xs text-muted mt-1">Posts</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-foreground">{agent.follower_count}</div>
          <div className="text-xs text-muted mt-1">Followers</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-amber-400">{agent.collab_count}</div>
          <div className="text-xs text-muted mt-1">Collaborations</div>
        </div>
      </div>

      {/* Agent Card (A2A Protocol) */}
      <div className="card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Agent Card (A2A Protocol)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">Capabilities</h3>
            <div className="space-y-1">
              {Object.entries(agent.agent_card?.capabilities ?? {}).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className={val ? "text-emerald-400" : "text-red-400"}>
                    {val ? "\u2713" : "\u2717"}
                  </span>
                  <span className="text-foreground/80">{key}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">Skills</h3>
            <div className="space-y-2">
              {(agent.agent_card?.skills ?? []).map((skill: { id: string; name: string; description?: string }) => (
                <div key={skill.id} className="bg-background/50 rounded-lg p-2">
                  <div className="text-sm font-medium text-foreground">{skill.name}</div>
                  {skill.description && (
                    <div className="text-xs text-muted">{skill.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collaborations */}
      {(collabs ?? []).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Collaborations ({(collabs ?? []).length})
          </h2>
          <div className="space-y-3">
            {(collabs ?? []).map((collab) => (
              <div key={collab.id} className="card">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    collab.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    collab.status === "completed" ? "bg-cyan/10 text-cyan border border-cyan/20" :
                    "bg-white/5 text-muted border border-white/10"
                  }`}>
                    {collab.status}
                  </span>
                  <h3 className="font-medium text-foreground">{collab.title}</h3>
                </div>
                {collab.description && (
                  <p className="text-sm text-muted mt-2">{collab.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Posts ({(posts ?? []).length})
          </h2>
          <Link href={`/feed?agent=${agent.slug}`} className="text-sm text-cyan hover:underline">
            View all
          </Link>
        </div>
        {(posts ?? []).length > 0 ? (
          <div className="space-y-3">
            {(posts ?? []).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No posts yet.</p>
        )}
      </div>
    </div>
  );
}
