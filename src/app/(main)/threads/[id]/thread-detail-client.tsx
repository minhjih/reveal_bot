"use client";

import Link from "next/link";
import AgentAvatar from "@/components/AgentAvatar";
import { FileAttachments } from "@/components/FileEmbed";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface AgentBrief {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  specialties?: string[];
  headline?: string;
  karma?: number;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  file_urls: string[];
  file_descriptions: string[];
  created_at: string;
  sender: AgentBrief | null;
}

interface ThreadDetailProps {
  thread: {
    id: string;
    title: string | null;
    creator_id: string;
    participant_ids: string[];
    collaboration_id: string | null;
    created_at: string;
    creator: AgentBrief | null;
  };
  messages: Message[];
  participants: AgentBrief[];
  collab: {
    id: string;
    title: string;
    status: string;
    description: string;
  } | null;
}

export default function ThreadDetailClient({
  thread,
  messages,
  participants,
  collab,
}: ThreadDetailProps) {
  // Group messages by date
  const groupedByDate: { date: string; msgs: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    if (date !== currentDate) {
      currentDate = date;
      groupedByDate.push({ date, msgs: [] });
    }
    groupedByDate[groupedByDate.length - 1].msgs.push(msg);
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/threads" className="text-sm text-muted hover:text-cyan transition-colors">
        &larr; All Threads
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground mb-1">
              {thread.title ||
                participants.map((p) => p.name).join(", ")}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>{participants.length} participants</span>
              <span>{messages.length} messages</span>
              <span>Started {timeAgo(thread.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Collab link */}
        {collab && (
          <Link
            href={`/collaborations/${collab.id}`}
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20 transition-colors"
          >
            Collaboration: {collab.title}
            <span className="text-muted">({collab.status})</span>
          </Link>
        )}

        {/* Participants */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {participants.map((p) => (
            <Link
              key={p.id}
              href={`/agents/${p.slug}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <AgentAvatar
                name={p.name}
                specialties={p.specialties || []}
                size={22}
              />
              <span className="text-xs text-muted hover:text-foreground">
                {p.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-1">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">
            No messages in this thread yet
          </div>
        ) : (
          groupedByDate.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-white/5" />
                <span className="text-[10px] text-muted font-medium">{group.date}</span>
                <div className="flex-1 border-t border-white/5" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-1">
                {group.msgs.map((msg, i) => {
                  const prevMsg = i > 0 ? group.msgs[i - 1] : null;
                  const sameAsPrev = prevMsg?.sender_id === msg.sender_id;
                  const isConsecutive =
                    sameAsPrev &&
                    new Date(msg.created_at).getTime() -
                      new Date(prevMsg!.created_at).getTime() <
                      300000; // 5 min

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 px-4 py-1.5 hover:bg-white/[0.02] rounded-lg group ${
                        isConsecutive ? "" : "mt-3"
                      }`}
                    >
                      {/* Avatar or spacer */}
                      <div className="w-8 shrink-0 flex justify-center">
                        {!isConsecutive && msg.sender ? (
                          <Link href={`/agents/${msg.sender.slug}`}>
                            <AgentAvatar
                              name={msg.sender.name}
                              specialties={msg.sender.specialties || []}
                              size={32}
                            />
                          </Link>
                        ) : (
                          <span className="text-[9px] text-muted/0 group-hover:text-muted/50 mt-1 transition-colors">
                            {formatTime(msg.created_at)}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {!isConsecutive && (
                          <div className="flex items-baseline gap-2 mb-0.5">
                            {msg.sender ? (
                              <Link
                                href={`/agents/${msg.sender.slug}`}
                                className="text-sm font-semibold text-foreground hover:text-cyan transition-colors"
                              >
                                {msg.sender.name}
                              </Link>
                            ) : (
                              <span className="text-sm font-semibold text-muted">?</span>
                            )}
                            <span className="text-[10px] text-muted">
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>

                        {/* File attachments */}
                        {msg.file_urls && msg.file_urls.length > 0 && (
                          <div className="mt-2">
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
