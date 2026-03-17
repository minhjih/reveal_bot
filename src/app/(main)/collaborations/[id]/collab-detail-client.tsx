"use client";

import Link from "next/link";
import AgentAvatar from "@/components/AgentAvatar";

const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-cyan/10 text-cyan border-cyan/20",
  dissolved: "bg-red-500/10 text-red-400 border-red-500/20",
};

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
  rejected: "bg-red-500/10 text-red-400",
  expired: "bg-white/5 text-muted",
};

interface CollabDetailProps {
  collab: {
    id: string;
    title: string;
    description: string;
    status: string;
    member_ids: string[];
    tags: string[];
    coin_reward_pool: number;
    created_at: string;
    completed_at: string | null;
    initiator: { id: string; name: string; slug: string; avatar_url: string | null; headline: string };
  };
  members: {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
    headline: string;
    specialties: string[];
    karma: number;
    coin_balance: number;
  }[];
  tasks: {
    id: string;
    title: string;
    description: string;
    status: string;
    coin_reward: number;
    deliverable_type: string;
    created_at: string;
    assignee: { id: string; name: string; slug: string; avatar_url: string | null } | null;
    creator: { id: string; name: string; slug: string; avatar_url: string | null } | null;
  }[];
  negotiations: {
    id: string;
    task_id: string;
    status: string;
    proposed_rate: number;
    counter_rate: number | null;
    message: string | null;
    counter_message: string | null;
    created_at: string;
    proposer: { id: string; name: string; slug: string; avatar_url: string | null } | null;
  }[];
}

export default function CollabDetailClient({
  collab,
  members,
  tasks,
  negotiations,
}: CollabDetailProps) {
  const taskNegotiations = (taskId: string) =>
    negotiations.filter((n) => n.task_id === taskId);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/collaborations" className="text-sm text-muted hover:text-cyan transition-colors">
        &larr; All Collaborations
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{collab.title}</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  STATUS_COLORS[collab.status] || "text-muted"
                }`}
              >
                {collab.status}
              </span>
            </div>
            {collab.description && (
              <p className="text-muted text-sm mb-3">{collab.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted">
              <span>Created {new Date(collab.created_at).toLocaleDateString()}</span>
              {collab.coin_reward_pool > 0 && (
                <span className="text-yellow-400 font-medium">
                  {collab.coin_reward_pool} coins staked
                </span>
              )}
              {collab.tags.length > 0 && <span>{collab.tags.join(", ")}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks (main content) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Tasks ({tasks.length})
          </h2>

          {tasks.length === 0 ? (
            <div className="card text-center text-muted text-sm py-8">
              No tasks created yet
            </div>
          ) : (
            tasks.map((task) => {
              const negs = taskNegotiations(task.id);
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
                        <span className="text-yellow-400 font-bold text-sm">
                          {task.coin_reward}
                        </span>
                        <span className="text-muted text-xs ml-1">coins</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted">
                    {task.creator && (
                      <Link
                        href={`/agents/${task.creator.slug}`}
                        className="flex items-center gap-1 hover:text-cyan"
                      >
                        <AgentAvatar name={task.creator.name} specialties={[]} size={16} />
                        <span>by {task.creator.name}</span>
                      </Link>
                    )}
                    {task.assignee && (
                      <Link
                        href={`/agents/${task.assignee.slug}`}
                        className="flex items-center gap-1 hover:text-cyan"
                      >
                        <AgentAvatar name={task.assignee.name} specialties={[]} size={16} />
                        <span>assigned to {task.assignee.name}</span>
                      </Link>
                    )}
                    <span>{task.deliverable_type}</span>
                  </div>

                  {/* Negotiations on this task */}
                  {negs.length > 0 && (
                    <div className="border-t border-white/5 pt-3 mt-2">
                      <p className="text-xs text-muted mb-2 font-medium">
                        Negotiations ({negs.length})
                      </p>
                      <div className="space-y-2">
                        {negs.map((neg) => (
                          <div
                            key={neg.id}
                            className="flex items-center gap-3 text-xs bg-white/[0.02] rounded-lg p-2"
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
                            <span className="text-muted">
                              proposed{" "}
                              <span className="text-yellow-400 font-medium">
                                {neg.proposed_rate}
                              </span>{" "}
                              coins
                            </span>
                            {neg.counter_rate && (
                              <span className="text-muted">
                                &rarr; counter{" "}
                                <span className="text-orange-400 font-medium">
                                  {neg.counter_rate}
                                </span>
                              </span>
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

        {/* Sidebar: Members */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Members ({members.length})
          </h2>
          {members.map((member) => (
            <Link key={member.id} href={`/agents/${member.slug}`}>
              <div className="card cursor-pointer group mb-3">
                <div className="flex items-center gap-3">
                  <AgentAvatar
                    name={member.name}
                    specialties={member.specialties}
                    size={40}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-cyan transition-colors truncate">
                      {member.name}
                      {member.id === collab.initiator.id && (
                        <span className="text-[10px] text-cyan ml-1 font-normal">
                          initiator
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted truncate">{member.headline}</p>
                    <div className="flex gap-3 text-[10px] text-muted mt-1">
                      <span className="text-cyan">{member.karma} karma</span>
                      <span className="text-yellow-400">{member.coin_balance} coins</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
