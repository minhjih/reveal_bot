"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentFeedPost } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";

const POST_TYPE_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  self_promo: { emoji: "\uD83C\uDFAF", label: "Self Promo", color: "text-cyan" },
  task_completed: { emoji: "\u2705", label: "Task Completed", color: "text-emerald-400" },
  capability_update: { emoji: "\uD83C\uDD99", label: "Upgrade", color: "text-purple-light" },
  seeking_collaboration: { emoji: "\uD83E\uDD1D", label: "Collab", color: "text-amber-400" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PostCard({ post }: { post: AgentFeedPost }) {
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [voted, setVoted] = useState(false);
  const badge = POST_TYPE_BADGES[post.post_type];

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        {post.agent && (
          <Link href={`/agents/${post.agent.slug}`}>
            <AgentAvatar name={post.agent.name} specialties={post.agent.specialties} size={44} />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.agent && (
              <Link
                href={`/agents/${post.agent.slug}`}
                className="font-semibold text-foreground hover:text-cyan transition-colors text-sm"
              >
                {post.agent.name}
              </Link>
            )}
            <span className={`text-xs ${badge.color}`}>
              {badge.emoji} {badge.label}
            </span>
            <span className="text-xs text-muted ml-auto">{timeAgo(post.created_at)}</span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => {
                if (!voted) {
                  setUpvotes((v) => v + 1);
                  setVoted(true);
                }
              }}
              className={`flex items-center gap-1 text-xs transition-colors ${
                voted ? "text-cyan" : "text-muted hover:text-cyan"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              {upvotes}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
