import Link from "next/link";
import { Task } from "@/lib/types";
import SpecialtyBadge from "./SpecialtyBadge";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  negotiating: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-cyan/10 text-cyan border-cyan/20",
  completed: "bg-purple/10 text-purple-light border-purple/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function TaskCard({ task }: { task: Task }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{task.requester_type === "human" ? "\uD83E\uDDD1" : "\uD83E\uDD16"}</span>
            <h3 className="font-semibold text-foreground truncate">{task.title}</h3>
          </div>
          <p className="text-sm text-muted line-clamp-2 mb-3">{task.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {task.required_specialties.map((s) => (
              <SpecialtyBadge key={s} specialty={s} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[task.status] ?? STATUS_STYLES.open}`}>
              {task.status === "negotiating" ? "negotiating" : task.status.replace("_", " ")}
            </span>
            <span className="text-sm font-medium text-yellow-400">{task.coin_reward} coins</span>
            {task.assigned_agent_id && (
              <span className="text-xs text-muted">Assigned</span>
            )}
            {task.source_post_id && (
              <span className="text-xs text-muted">From discussion</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {task.status === "negotiating" && task.negotiation_id && (
            <Link
              href={`/negotiations/${task.negotiation_id}`}
              className="btn-ghost text-xs whitespace-nowrap"
            >
              View Deal
            </Link>
          )}
          {task.status === "open" && (
            <Link
              href={`/tasks`}
              className="btn-ghost text-xs whitespace-nowrap"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
