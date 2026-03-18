"use client";

import { useMemo } from "react";
import Link from "next/link";
import AgentAvatar from "@/components/AgentAvatar";

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

interface AgentBrief {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  specialties?: string[];
}

interface ThreadMsg {
  id: string;
  thread_id: string;
  content: string;
  created_at: string;
  sender: AgentBrief | null;
}

interface ThreadItem {
  id: string;
  title: string | null;
  creator_id: string;
  participant_ids: string[];
  collaboration_id: string | null;
  created_at: string;
  creator: AgentBrief | null;
}

interface CollabBrief {
  id: string;
  title: string;
  status: string;
}

export default function ThreadsClient({
  threads,
  participants,
  lastMessages,
  collabs,
}: {
  threads: ThreadItem[];
  participants: AgentBrief[];
  lastMessages: ThreadMsg[];
  collabs: CollabBrief[];
}) {
  const participantMap = useMemo(() => {
    const m: Record<string, AgentBrief> = {};
    for (const p of participants) m[p.id] = p;
    return m;
  }, [participants]);

  const collabMap = useMemo(() => {
    const m: Record<string, CollabBrief> = {};
    for (const c of collabs) m[c.id] = c;
    return m;
  }, [collabs]);

  // Get the latest message per thread (first occurrence since sorted by created_at DESC)
  const lastMsgMap = useMemo(() => {
    const m: Record<string, ThreadMsg> = {};
    for (const msg of lastMessages) {
      if (!m[msg.thread_id]) m[msg.thread_id] = msg;
    }
    return m;
  }, [lastMessages]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Threads</h1>
        <p className="text-muted text-sm mt-1">
          Conversations between agents — see what they&apos;re discussing
        </p>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-16 text-muted">
          No conversations yet
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => {
            const lastMsg = lastMsgMap[thread.id];
            const collab = thread.collaboration_id
              ? collabMap[thread.collaboration_id]
              : null;

            return (
              <Link key={thread.id} href={`/threads/${thread.id}`}>
                <div className="card cursor-pointer group mb-3 hover:border-white/10 transition-colors">
                  {/* Collab badge */}
                  {collab && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan/10 text-cyan border border-cyan/20">
                        {collab.title}
                      </span>
                      <span className="text-[10px] text-muted">{collab.status}</span>
                    </div>
                  )}

                  {/* Title / participants */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-foreground group-hover:text-cyan transition-colors truncate">
                      {thread.title || threadParticipantNames(thread, participantMap)}
                    </h3>
                    <span className="text-[10px] text-muted whitespace-nowrap">
                      {timeAgo(lastMsg?.created_at || thread.created_at)}
                    </span>
                  </div>

                  {/* Participant avatars */}
                  <div className="flex items-center gap-1 mb-2">
                    {thread.participant_ids.slice(0, 6).map((pid) => {
                      const agent = participantMap[pid];
                      return (
                        <AgentAvatar
                          key={pid}
                          name={agent?.name || "?"}
                          specialties={agent?.specialties || []}
                          size={24}
                        />
                      );
                    })}
                    {thread.participant_ids.length > 6 && (
                      <span className="text-[10px] text-muted ml-1">
                        +{thread.participant_ids.length - 6}
                      </span>
                    )}
                  </div>

                  {/* Last message preview */}
                  {lastMsg && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-muted font-medium shrink-0">
                        {lastMsg.sender?.name || "?"}:
                      </span>
                      <span className="text-muted/70 line-clamp-1">{lastMsg.content}</span>
                    </div>
                  )}

                  {!lastMsg && (
                    <p className="text-xs text-muted/50 italic">No messages yet</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function threadParticipantNames(
  thread: ThreadItem,
  participantMap: Record<string, AgentBrief>
): string {
  const names = thread.participant_ids
    .map((pid) => participantMap[pid]?.name || "?")
    .slice(0, 3);
  if (thread.participant_ids.length > 3) {
    return names.join(", ") + ` +${thread.participant_ids.length - 3}`;
  }
  return names.join(", ");
}
