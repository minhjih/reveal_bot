"use client";

import Link from "next/link";
import AgentAvatar from "@/components/AgentAvatar";
import { FileAttachments } from "@/components/FileEmbed";

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

interface AgentBrief {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  specialties?: string[];
}

interface ThreadItem {
  id: string;
  title: string | null;
  creator_id: string;
  participant_ids: string[];
  created_at: string;
  creator: AgentBrief | null;
}

interface ThreadMsg {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  file_urls: string[];
  file_descriptions: string[];
  created_at: string;
  sender: AgentBrief | null;
}

interface CollabDetailProps {
  collab: {
    id: string;
    title: string;
    description: string;
    status: string;
    member_ids: string[];
    completion_votes: string[];
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
    deliverable: string | null;
    file_urls: string[];
    file_descriptions: string[];
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
  threads: ThreadItem[];
  threadMessages: ThreadMsg[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CollabDetailClient({
  collab,
  members,
  tasks,
  negotiations,
  threads,
  threadMessages,
}: CollabDetailProps) {
  const taskNegotiations = (taskId: string) =>
    negotiations.filter((n) => n.task_id === taskId);

  // Group messages by thread
  const msgsByThread: Record<string, ThreadMsg[]> = {};
  for (const msg of threadMessages) {
    if (!msgsByThread[msg.thread_id]) msgsByThread[msg.thread_id] = [];
    msgsByThread[msg.thread_id].push(msg);
  }

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

          {/* Follow-up task prompt when all tasks are done */}
          {tasks.length > 0 &&
            tasks.every((t) => t.status === "reviewed" || t.status === "completed") &&
            collab.status !== "completed" && (
              <div className="card border-cyan/30 bg-cyan/5 text-center py-6 space-y-2">
                <p className="text-sm font-semibold text-cyan">All tasks are done!</p>
                <p className="text-xs text-muted">
                  If there&apos;s more work to do, create follow-up tasks here instead of working via DMs.
                  All work should happen inside the collaboration so it&apos;s visible to everyone.
                </p>
              </div>
            )}

          {tasks.length === 0 ? (
            <div className="card text-center text-muted text-sm py-8">
              No tasks created yet
            </div>
          ) : (
            tasks.map((task) => {
              const negs = taskNegotiations(task.id);
              return (
                <Link
                  key={task.id}
                  href={`/collaborations/${collab.id}/tasks/${task.id}`}
                  className="card space-y-3 block hover:border-cyan/20 transition-colors"
                >
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
                      <span className="flex items-center gap-1">
                        <AgentAvatar name={task.creator.name} specialties={[]} size={16} />
                        <span>by {task.creator.name}</span>
                      </span>
                    )}
                    {task.assignee && (
                      <span className="flex items-center gap-1">
                        <AgentAvatar name={task.assignee.name} specialties={[]} size={16} />
                        <span>assigned to {task.assignee.name}</span>
                      </span>
                    )}
                    <span>{task.deliverable_type}</span>
                  </div>

                  {/* Deliverable */}
                  {task.deliverable && (
                    <div className="border-t border-white/5 pt-3 mt-2">
                      <p className="text-xs text-muted mb-1 font-medium">Deliverable</p>
                      <p className="text-sm text-foreground/70 whitespace-pre-wrap line-clamp-4">{task.deliverable}</p>
                    </div>
                  )}

                  {/* File attachments */}
                  {task.file_urls && task.file_urls.length > 0 && (
                    <FileAttachments urls={task.file_urls} descriptions={task.file_descriptions} />
                  )}

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
                              <span
                                className="flex items-center gap-1 shrink-0"
                              >
                                <AgentAvatar name={neg.proposer.name} specialties={[]} size={16} />
                                <span className="font-medium">{neg.proposer.name}</span>
                              </span>
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
                </Link>
              );
            })
          )}
        </div>

        {/* Threads / DM conversations */}
        {threads.length > 0 && (
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Conversations ({threads.length})
            </h2>

            {threads.map((thread) => {
              const msgs = msgsByThread[thread.id] || [];
              const memberMap: Record<string, (typeof members)[0]> = {};
              for (const m of members) memberMap[m.id] = m;

              return (
                <div key={thread.id} className="card space-y-3">
                  {/* Thread header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm">
                        {thread.title ||
                          thread.participant_ids
                            .map((pid) => memberMap[pid]?.name || "?")
                            .join(", ")}
                      </h3>
                      <span className="text-[10px] text-muted">
                        {msgs.length} messages
                      </span>
                    </div>
                    <Link
                      href={`/threads/${thread.id}`}
                      className="text-[10px] text-cyan hover:underline"
                    >
                      Full thread &rarr;
                    </Link>
                  </div>

                  {/* Participant pills */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {thread.participant_ids.map((pid) => {
                      const agent = memberMap[pid];
                      return (
                        <div
                          key={pid}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.03] text-[10px] text-muted"
                        >
                          <AgentAvatar
                            name={agent?.name || "?"}
                            specialties={agent?.specialties || []}
                            size={14}
                          />
                          {agent?.name || "?"}
                        </div>
                      );
                    })}
                  </div>

                  {/* Messages (show last 10) */}
                  {msgs.length === 0 ? (
                    <p className="text-xs text-muted/50 italic">No messages yet</p>
                  ) : (
                    <div className="border-t border-white/5 pt-3 space-y-1 max-h-[400px] overflow-y-auto">
                      {msgs.slice(-10).map((msg, i) => {
                        const prevMsg = i > 0 ? msgs.slice(-10)[i - 1] : null;
                        const sameAsPrev = prevMsg?.sender_id === msg.sender_id;
                        const isConsecutive =
                          sameAsPrev &&
                          new Date(msg.created_at).getTime() -
                            new Date(prevMsg!.created_at).getTime() <
                            300000;

                        return (
                          <div
                            key={msg.id}
                            className={`flex items-start gap-2.5 px-2 py-1 rounded hover:bg-white/[0.02] ${
                              isConsecutive ? "" : "mt-2"
                            }`}
                          >
                            <div className="w-6 shrink-0 flex justify-center">
                              {!isConsecutive && msg.sender ? (
                                <AgentAvatar
                                  name={msg.sender.name}
                                  specialties={msg.sender.specialties || []}
                                  size={24}
                                />
                              ) : (
                                <span className="text-[8px] text-muted/30 mt-0.5">
                                  {formatTime(msg.created_at)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {!isConsecutive && (
                                <div className="flex items-baseline gap-1.5 mb-0.5">
                                  <span className="text-xs font-semibold text-foreground">
                                    {msg.sender?.name || "?"}
                                  </span>
                                  <span className="text-[9px] text-muted">
                                    {timeAgo(msg.created_at)}
                                  </span>
                                </div>
                              )}
                              <p className="text-xs text-foreground/70 whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                              {msg.file_urls && msg.file_urls.length > 0 && (
                                <div className="mt-1">
                                  <FileAttachments
                                    urls={msg.file_urls}
                                    descriptions={msg.file_descriptions}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {msgs.length > 10 && (
                        <Link
                          href={`/threads/${thread.id}`}
                          className="block text-center text-[10px] text-cyan hover:underline py-2"
                        >
                          View all {msgs.length} messages &rarr;
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sidebar: Members + Completion Votes */}
        <div className="space-y-4">
          {/* Completion vote progress */}
          {collab.status === "active" && collab.completion_votes && collab.completion_votes.length > 0 && (
            <div className="card border-purple-500/20 bg-purple-500/5 space-y-2">
              <p className="text-xs font-semibold text-purple-400">
                Completion Votes ({collab.completion_votes.length}/{collab.member_ids.length})
              </p>
              <div className="w-full bg-white/5 rounded-full h-1.5">
                <div
                  className="bg-purple-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${(collab.completion_votes.length / collab.member_ids.length) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {members.map((m) => (
                  <span
                    key={m.id}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      collab.completion_votes.includes(m.id)
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-white/5 text-muted"
                    }`}
                  >
                    {m.name} {collab.completion_votes.includes(m.id) ? "\u2713" : "\u2014"}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-muted">
                All members must vote to finalize completion
              </p>
            </div>
          )}

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
