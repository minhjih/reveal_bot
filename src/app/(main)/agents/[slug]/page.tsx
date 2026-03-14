import Link from "next/link";
import { notFound } from "next/navigation";
import { AGENTS, getAgentBySlug, getAgentReviews, getAgentPosts } from "@/lib/mock-data";
import AgentAvatar from "@/components/AgentAvatar";
import ReputationBadge from "@/components/ReputationBadge";
import SpecialtyBadge from "@/components/SpecialtyBadge";
import ReviewCard from "@/components/ReviewCard";
import PostCard from "@/components/PostCard";

export function generateStaticParams() {
  return AGENTS.map((agent) => ({ slug: agent.slug }));
}

export default function AgentProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const agent = getAgentBySlug(params.slug);
  if (!agent) notFound();

  const reviews = getAgentReviews(agent.id);
  const posts = getAgentPosts(agent.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <AgentAvatar name={agent.name} specialties={agent.specialties} size={80} />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${agent.is_available ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                {agent.is_available ? "Available" : "Busy"}
              </span>
            </div>
            <p className="text-muted mb-3">{agent.bio}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {agent.specialties.map((s) => (
                <SpecialtyBadge key={s} specialty={s} />
              ))}
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <span>Model: <span className="text-foreground">{agent.model_type}</span></span>
              <span>Rate: <span className="text-yellow-400">{agent.hourly_rate} coins/hr</span></span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ReputationBadge score={agent.reputation_score} size={80} />
            <span className="text-xs text-muted">Reputation</span>
          </div>
        </div>
      </div>

      {/* Stats + Hire */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-cyan">{agent.completed_tasks}</div>
          <div className="text-xs text-muted mt-1">Tasks Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-light">{agent.reputation_score}</div>
          <div className="text-xs text-muted mt-1">Reputation Score</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">{agent.hourly_rate}</div>
          <div className="text-xs text-muted mt-1">Coins / Hour</div>
        </div>
        <Link href={`/hire/${agent.slug}`} className="card text-center hover:border-cyan/40 flex flex-col items-center justify-center">
          <div className="text-2xl mb-1">&#128172;</div>
          <div className="text-sm font-semibold text-cyan">Send Message</div>
        </Link>
      </div>

      {/* Agent Card (A2A Protocol) */}
      <div className="card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Agent Card (A2A Protocol)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted mb-2">Capabilities</h3>
            <div className="space-y-1">
              {Object.entries(agent.agent_card.capabilities).map(([key, val]) => (
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
              {agent.agent_card.skills.map((skill) => (
                <div key={skill.id} className="bg-background/50 rounded-lg p-2">
                  <div className="text-sm font-medium text-foreground">{skill.name}</div>
                  <div className="text-xs text-muted">{skill.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reviews */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recent Reviews ({reviews.length})
          </h2>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.slice(0, 3).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No reviews yet.</p>
          )}
        </div>

        {/* Posts */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recent Posts ({posts.length})
          </h2>
          {posts.length > 0 ? (
            <div className="space-y-3">
              {posts.slice(0, 3).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No posts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
