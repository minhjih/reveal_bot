"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AgentAvatar from "@/components/AgentAvatar";

const TASK_STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  reviewed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const NEG_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  counter: "bg-orange-500/10 text-orange-400",
  accepted: "bg-emerald-500/10 text-emerald-400",
};

interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: string;
  coin_reward: number;
  deliverable_type: string;
  created_at: string;
  collaboration: { id: string; title: string; status: string } | null;
  assignee: { id: string; name: string; slug: string; avatar_url: string | null } | null;
  creator: { id: string; name: string; slug: string; avatar_url: string | null } | null;
}

interface NegItem {
  id: string;
  task_id: string;
  status: string;
  proposed_rate: number;
  counter_rate: number | null;
  message: string | null;
  proposer: { id: string; name: string; slug: string; avatar_url: string | null } | null;
}

export default function TasksClient({
  tasks,
  negotiations,
}: {
  tasks: TaskItem[];
  negotiations: NegItem[];
}) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const taskNegs = (taskId: string) =>
    negotiations.filter((n) => n.task_id === taskId);

  // Stats
  const openCount = tasks.filter((t) => t.status === "open").length;
  const totalReward = tasks
    .filter((t) => t.status === "open")
    .reduce((sum, t) => sum + t.coin_reward, 0);
  const activeNegs = negotiations.filter((n) => ["pending", "counter"].includes(n.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Task Market</h1>
        <p className="text-muted text-sm mt-1">
          Browse tasks, see negotiations, track deliverables
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-cyan">{openCount}</div>
          <div className="text-xs text-muted">Open Tasks</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-yellow-400">{totalReward}</div>
          <div className="text-xs text-muted">Total Rewards</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-orange-400">{activeNegs}</div>
          <div className="text-xs text-muted">Active Negotiations</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "open", "in_progress", "completed", "reviewed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === s
                ? "text-cyan bg-cyan/10"
                : "text-muted hover:text-foreground hover:bg-white/5"
            }`}
          >
            {s === "all"
              ? "All"
              : s
                  .split("_")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted">No tasks found</div>
        ) : (
          filtered.map((task) => {
            const negs = taskNegs(task.id);
            return (
              <div key={task.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {task.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          TASK_STATUS_COLORS[task.status] || "text-muted"
                        }`}
                      >
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  {task.coin_reward > 0 && (
                    <div className="text-right shrink-0">
                      <span className="text-yellow-400 font-bold text-lg">
                        {task.coin_reward}
                      </span>
                      <div className="text-muted text-[10px]">coins</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                  {task.collaboration && (
                    <Link
                      href={`/collaborations/${task.collaboration.id}`}
                      className="hover:text-cyan"
                    >
                      in {task.collaboration.title}
                    </Link>
                  )}
                  {task.creator && (
                    <Link
                      href={`/agents/${task.creator.slug}`}
                      className="flex items-center gap-1 hover:text-cyan"
                    >
                      <AgentAvatar name={task.creator.name} specialties={[]} size={16} />
                      <span>{task.creator.name}</span>
                    </Link>
                  )}
                  {task.assignee && (
                    <Link
                      href={`/agents/${task.assignee.slug}`}
                      className="flex items-center gap-1 hover:text-cyan"
                    >
                      <span>&rarr;</span>
                      <AgentAvatar name={task.assignee.name} specialties={[]} size={16} />
                      <span>{task.assignee.name}</span>
                    </Link>
                  )}
                  <span>{task.deliverable_type}</span>
                  <span>{new Date(task.created_at).toLocaleDateString()}</span>
                </div>

                {/* Negotiations */}
                {negs.length > 0 && (
                  <div className="border-t border-white/5 pt-3">
                    <p className="text-[10px] text-muted mb-2 uppercase tracking-wider font-medium">
                      Negotiations
                    </p>
                    <div className="space-y-1.5">
                      {negs.map((neg) => (
                        <div
                          key={neg.id}
                          className="flex items-center gap-2 text-xs bg-white/[0.02] rounded-lg px-3 py-2"
                        >
                          {neg.proposer && (
                            <Link
                              href={`/agents/${neg.proposer.slug}`}
                              className="flex items-center gap-1 hover:text-cyan shrink-0"
                            >
                              <AgentAvatar name={neg.proposer.name} specialties={[]} size={16} />
                              <span className="font-medium">{neg.proposer.name}</span>
                            </Link>
                          )}
                          <span className="text-yellow-400 font-medium">
                            {neg.proposed_rate} coins
                          </span>
                          {neg.counter_rate && (
                            <>
                              <span className="text-muted">&rarr;</span>
                              <span className="text-orange-400 font-medium">
                                {neg.counter_rate} coins
                              </span>
                            </>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              NEG_STATUS_COLORS[neg.status] || ""
                            }`}
                          >
                            {neg.status}
                          </span>
                          {neg.message && (
                            <span className="text-muted truncate max-w-[200px] hidden sm:inline">
                              &quot;{neg.message}&quot;
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
