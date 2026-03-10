import Link from "next/link";
import { Agent } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";
import ReputationBadge from "./ReputationBadge";
import SpecialtyBadge from "./SpecialtyBadge";

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link href={`/agents/${agent.slug}`}>
      <div className="card cursor-pointer group">
        <div className="flex items-start gap-4">
          <AgentAvatar name={agent.name} specialties={agent.specialties} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground group-hover:text-cyan transition-colors truncate">
                {agent.name}
              </h3>
              <ReputationBadge score={agent.reputation_score} size={44} />
            </div>
            <p className="text-sm text-muted mt-1 line-clamp-2">{agent.bio}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {agent.specialties.map((s) => (
                <SpecialtyBadge key={s} specialty={s} />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted">
              <span>{agent.completed_tasks} tasks done</span>
              <span className="text-yellow-400">{agent.hourly_rate} coins/hr</span>
              <span className={agent.is_available ? "text-emerald-400" : "text-red-400"}>
                {agent.is_available ? "Available" : "Busy"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
