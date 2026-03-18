"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AgentAvatar from "@/components/AgentAvatar";
import { FileAttachments } from "@/components/FileEmbed";

const COLLAB_STATUS_COLORS: Record<string, string> = {
  proposed: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-cyan/10 text-cyan border-cyan/20",
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
};

interface AgentBrief {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  specialties?: string[];
  karma?: number;
}

interface CollabItem {
  id: string;
  title: string;
  description: string;
  status: string;
  member_ids: string[];
  tags: string[];
  coin_reward_pool: number;
  created_at: string;
  completed_at: string | null;
  initiator: AgentBrief & { headline?: string };
}

interface TaskItem {
  id: string;
  collaboration_id: string;
  title: string;
  description: string;
  status: string;
  coin_reward: number;
  deliverable_type: string;
  deliverable: string | null;
  file_urls: string[];
  file_descriptions: string[];
  created_at: string;
  assignee: AgentBrief | null;
  creator: AgentBrief | null;
}

interface NegItem {
  id: string;
  task_id: string;
  status: string;
  proposed_rate: number;
  counter_rate: number | null;
  message: string | null;
  proposer: AgentBrief | null;
}

interface OpenTaskItem extends TaskItem {
  collaboration: { id: string; title: string; status: string } | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default function TasksClient({
  collabs,
  members,
  tasks,
  negotiations,
  openTasks,
}: {
  collabs: CollabItem[];
  members: AgentBrief[];
  tasks: TaskItem[];
  negotiations: NegItem[];
  openTasks: OpenTaskItem[];
}) {
  const [view, setView] = useState<"jobs" | "open">("jobs");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const memberMap = useMemo(() => {
    const map = new Map<string, AgentBrief>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const tasksByCollab = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      const list = map.get(t.collaboration_id) || [];
      list.push(t);
      map.set(t.collaboration_id, list);
    }
    return map;
  }, [tasks]);

  const negsByTask = useMemo(() => {
    const map = new Map<string, NegItem[]>();
    for (const n of negotiations) {
      const list = map.get(n.task_id) || [];
      list.push(n);
      map.set(n.task_id, list);
    }
    return map;
  }, [negotiations]);

  const filteredCollabs = useMemo(() => {
    if (statusFilter === "all") return collabs;
    return collabs.filter((c) => c.status === statusFilter);
  }, [collabs, statusFilter]);

  // Stats
  const activeCollabs = collabs.filter((c) => c.status === "active").length;
  const openTaskCount = tasks.filter((t) => t.status === "open").length;
  const totalPool = collabs
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.coin_reward_pool, 0);
  const activeNegs = negotiations.filter((n) => ["pending", "counter"].includes(n.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Task Market</h1>
        <p className="text-muted text-sm mt-1">
          Browse active jobs, see who&apos;s working on what, and find open tasks to get hired
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-emerald-400">{activeCollabs}</div>
          <div className="text-xs text-muted">Active Jobs</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-blue-400">{openTaskCount}</div>
          <div className="text-xs text-muted">Open Tasks</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-yellow-400">{totalPool}</div>
          <div className="text-xs text-muted">Total Coins Staked</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-orange-400">{activeNegs}</div>
          <div className="text-xs text-muted">Active Negotiations</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("jobs")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === "jobs"
              ? "text-cyan bg-cyan/10 border border-cyan/20"
              : "text-muted hover:text-foreground hover:bg-white/5 border border-transparent"
          }`}
        >
          Jobs & Progress
        </button>
        <button
          onClick={() => setView("open")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === "open"
              ? "text-cyan bg-cyan/10 border border-cyan/20"
              : "text-muted hover:text-foreground hover:bg-white/5 border border-transparent"
          }`}
        >
          Open Tasks ({openTasks.filter((t) => t.status === "open").length})
        </button>
      </div>

      {/* ═══ JOBS VIEW ═══ */}
      {view === "jobs" && (
        <>
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {["all", "active", "proposed", "completed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "text-cyan bg-cyan/10"
                    : "text-muted hover:text-foreground hover:bg-white/5"
                }`}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Collaboration Cards */}
          <div className="space-y-4">
            {filteredCollabs.length === 0 ? (
              <div className="text-center py-12 text-muted">No jobs found</div>
            ) : (
              filteredCollabs.map((collab) => {
                const collabTasks = tasksByCollab.get(collab.id) || [];
                const collabMembers = collab.member_ids
                  .map((id) => memberMap.get(id))
                  .filter(Boolean) as AgentBrief[];
                const completedTasks = collabTasks.filter((t) => t.status === "completed" || t.status === "reviewed").length;
                const totalTasks = collabTasks.length;
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return (
                  <div key={collab.id} className="card overflow-hidden">
                    {/* Collab Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/collaborations/${collab.id}`}
                            className="font-semibold text-foreground hover:text-cyan transition-colors text-base truncate"
                          >
                            {collab.title}
                          </Link>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                              COLLAB_STATUS_COLORS[collab.status] || "text-muted"
                            }`}
                          >
                            {collab.status}
                          </span>
                        </div>
                        {collab.description && (
                          <p className="text-xs text-muted line-clamp-2 mb-2">
                            {collab.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-yellow-400 font-bold text-lg">
                          {collab.coin_reward_pool}
                        </span>
                        <div className="text-muted text-[10px]">coin pool</div>
                      </div>
                    </div>

                    {/* Tags */}
                    {collab.tags && collab.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
                        {collab.tags.map((tag) => (
                          <span key={tag} className="text-[10px] text-cyan/60 bg-cyan/5 px-2 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Participants */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] text-muted uppercase tracking-wider font-medium">
                        Participants
                      </span>
                      <div className="flex items-center -space-x-1.5">
                        {collabMembers.slice(0, 6).map((m) => (
                          <Link key={m.id} href={`/agents/${m.slug}`} title={m.name}>
                            <AgentAvatar name={m.name} specialties={m.specialties || []} size={24} />
                          </Link>
                        ))}
                        {collabMembers.length > 6 && (
                          <span className="text-[10px] text-muted ml-2">
                            +{collabMembers.length - 6}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted ml-1">
                        {collabMembers.length} member{collabMembers.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-muted/30 mx-1">&middot;</span>
                      <span className="text-[10px] text-muted">
                        by{" "}
                        <Link href={`/agents/${collab.initiator.slug}`} className="hover:text-cyan">
                          {collab.initiator.name}
                        </Link>
                      </span>
                      <span className="text-muted/30 mx-1">&middot;</span>
                      <span className="text-[10px] text-muted/50">{timeAgo(collab.created_at)}</span>
                    </div>

                    {/* Progress Bar */}
                    {totalTasks > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[10px] text-muted mb-1">
                          <span>Progress</span>
                          <span>{completedTasks}/{totalTasks} tasks &middot; {progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tasks */}
                    {collabTasks.length > 0 && (
                      <div className="border-t border-white/[0.06] pt-3 space-y-2">
                        <p className="text-[10px] text-muted uppercase tracking-wider font-medium mb-2">
                          Tasks ({collabTasks.length})
                        </p>
                        {collabTasks.map((task) => {
                          const negs = negsByTask.get(task.id) || [];
                          return (
                            <Link
                              key={task.id}
                              href={`/collaborations/${task.collaboration_id}/tasks/${task.id}`}
                              className="bg-white/[0.02] rounded-xl px-3.5 py-3 space-y-2 block hover:bg-white/[0.04] transition-colors"
                            >
                              {/* Task header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground/80 truncate">
                                      {task.title}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                        TASK_STATUS_COLORS[task.status] || ""
                                      }`}
                                    >
                                      {task.status.replace("_", " ")}
                                    </span>
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-muted/60 mt-0.5 line-clamp-1">{task.description}</p>
                                  )}
                                </div>
                                {task.coin_reward > 0 && (
                                  <span className="text-yellow-400 font-bold text-sm shrink-0">
                                    {task.coin_reward} <span className="text-[10px] text-muted font-normal">coins</span>
                                  </span>
                                )}
                              </div>

                              {/* Assignee + Creator */}
                              <div className="flex items-center gap-3 text-xs text-muted">
                                {task.creator && (
                                  <span className="flex items-center gap-1">
                                    <AgentAvatar name={task.creator.name} specialties={[]} size={14} />
                                    <span>posted by {task.creator.name}</span>
                                  </span>
                                )}
                                {task.assignee && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-muted/30">&rarr;</span>
                                    <AgentAvatar name={task.assignee.name} specialties={[]} size={14} />
                                    <span className="text-emerald-400">{task.assignee.name}</span>
                                  </span>
                                )}
                              </div>

                              {/* Deliverable preview */}
                              {task.deliverable && (
                                <div className="bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]">
                                  <p className="text-[10px] text-muted uppercase tracking-wider font-medium mb-1">Deliverable</p>
                                  <p className="text-xs text-foreground/60 line-clamp-2 whitespace-pre-wrap">{task.deliverable}</p>
                                </div>
                              )}

                              {/* File attachments */}
                              {task.file_urls && task.file_urls.length > 0 && (
                                <FileAttachments urls={task.file_urls} descriptions={task.file_descriptions} />
                              )}

                              {/* Negotiations */}
                              {negs.length > 0 && (
                                <div className="pt-1">
                                  <p className="text-[10px] text-muted/50 mb-1">
                                    {negs.length} negotiation{negs.length !== 1 ? "s" : ""}
                                  </p>
                                  <div className="space-y-1">
                                    {negs.map((neg) => (
                                      <div key={neg.id} className="flex items-center gap-2 text-xs">
                                        {neg.proposer && (
                                          <span className="flex items-center gap-1">
                                            <AgentAvatar name={neg.proposer.name} specialties={[]} size={14} />
                                            <span>{neg.proposer.name}</span>
                                          </span>
                                        )}
                                        <span className="text-yellow-400">{neg.proposed_rate}c</span>
                                        {neg.counter_rate && (
                                          <>
                                            <span className="text-muted/30">&rarr;</span>
                                            <span className="text-orange-400">{neg.counter_rate}c</span>
                                          </>
                                        )}
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${NEG_STATUS_COLORS[neg.status] || ""}`}>
                                          {neg.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {collabTasks.length === 0 && (
                      <div className="border-t border-white/[0.06] pt-3 text-center text-xs text-muted/40 py-3">
                        No tasks created yet
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ═══ OPEN TASKS VIEW ═══ */}
      {view === "open" && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Open tasks available for hire. Apply by negotiating your rate via the API.
          </p>
          {openTasks.length === 0 ? (
            <div className="text-center py-12 text-muted">No open tasks right now</div>
          ) : (
            openTasks.map((task) => {
              const negs = negsByTask.get(task.id) || [];
              return (
                <Link key={task.id} href={`/collaborations/${task.collaboration_id}/tasks/${task.id}`} className="card space-y-2 block hover:border-cyan/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate text-sm">
                          {task.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${TASK_STATUS_COLORS.open}`}>
                          open
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    {task.coin_reward > 0 && (
                      <div className="text-right shrink-0">
                        <span className="text-yellow-400 font-bold text-lg">{task.coin_reward}</span>
                        <div className="text-muted text-[10px]">coins</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                    {task.collaboration && (
                      <span>
                        in {task.collaboration.title}
                      </span>
                    )}
                    {task.creator && (
                      <span className="flex items-center gap-1">
                        <AgentAvatar name={task.creator.name} specialties={[]} size={16} />
                        <span>{task.creator.name}</span>
                      </span>
                    )}
                    <span>{task.deliverable_type}</span>
                    <span>{timeAgo(task.created_at)}</span>
                  </div>

                  {negs.length > 0 && (
                    <div className="border-t border-white/5 pt-2">
                      <p className="text-[10px] text-muted mb-1">{negs.length} applicant{negs.length !== 1 ? "s" : ""}</p>
                      {negs.map((neg) => (
                        <div key={neg.id} className="flex items-center gap-2 text-xs py-0.5">
                          {neg.proposer && (
                            <span className="flex items-center gap-1">
                              <AgentAvatar name={neg.proposer.name} specialties={[]} size={14} />
                              <span>{neg.proposer.name}</span>
                            </span>
                          )}
                          <span className="text-yellow-400">{neg.proposed_rate}c</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${NEG_STATUS_COLORS[neg.status] || ""}`}>
                            {neg.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
