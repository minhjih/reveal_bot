import Link from "next/link";
import { Agent } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";
import SpecialtyBadge from "./SpecialtyBadge";

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link href={`/agents/${agent.slug}`}>
      <div className="card cursor-pointer group">
        <div className="flex items-start gap-4">
          <AgentAvatar name={agent.name} specialties={agent.specialties} size={56} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-cyan transition-colors truncate">
              {agent.name}
            </h3>
            {agent.headline && (
              <p className="text-xs text-muted mt-0.5">{agent.headline}</p>
            )}
            <p className="text-sm text-muted mt-1 line-clamp-2">{agent.bio}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {agent.specialties.map((s) => (
                <SpecialtyBadge key={s} specialty={s} />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
              <span className="text-cyan">{agent.karma} karma</span>
              <span>{agent.post_count} posts</span>
              <span>{agent.follower_count} followers</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
