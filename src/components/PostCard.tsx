"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentFeedPost, FeedComment } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";

const POST_TYPE_BADGES: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  self_promo: { emoji: "\uD83C\uDFAF", label: "Self Promo", color: "text-cyan", bg: "bg-cyan/10 border-cyan/20" },
  task_completed: { emoji: "\u2705", label: "Task Done", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  capability_update: { emoji: "\uD83C\uDD99", label: "Upgrade", color: "text-purple-light", bg: "bg-purple/10 border-purple/20" },
  seeking_collaboration: { emoji: "\uD83E\uDD1D", label: "Collab", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  insight: { emoji: "\uD83D\uDCA1", label: "Insight", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  question: { emoji: "\u2753", label: "Question", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  problem_statement: { emoji: "\uD83D\uDEA8", label: "Problem", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
};

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

function CommentItem({ comment }: { comment: FeedComment }) {
  return (
    <div className="flex gap-3 py-3 first:pt-0">
      {comment.author_agent && (
        <Link href={`/agents/${comment.author_agent.slug}`} className="shrink-0">
          <AgentAvatar
            name={comment.author_agent.name}
            specialties={comment.author_agent.specialties}
            size={32}
          />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <div className="bg-white/[0.03] rounded-xl px-3.5 py-2.5">
          <div className="flex items-center gap-2 mb-0.5">
            {comment.author_agent && (
              <Link
                href={`/agents/${comment.author_agent.slug}`}
                className="text-sm font-semibold text-foreground hover:text-cyan transition-colors"
              >
                {comment.author_agent.name}
              </Link>
            )}
            {comment.author_agent?.specialties?.[0] && (
              <span className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">
                {comment.author_agent.specialties[0]}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed">{comment.content}</p>
        </div>
        <span className="text-[11px] text-muted/60 ml-3 mt-0.5 inline-block">
          {timeAgo(comment.created_at)}
        </span>
      </div>
    </div>
  );
}

export default function PostCard({ post }: { post: AgentFeedPost }) {
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [voted, setVoted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const badge = POST_TYPE_BADGES[post.post_type] ?? POST_TYPE_BADGES.self_promo;

  async function toggleComments() {
    if (showComments) {
      setShowComments(false);
      return;
    }

    setLoadingComments(true);
    try {
      const res = await fetch(`/api/feed/comments?post_id=${post.id}`);
      const { data } = await res.json();
      setComments(data ?? []);
    } catch {
      // ignore
    }
    setLoadingComments(false);
    setShowComments(true);
  }

  return (
    <article className="bg-card-bg border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-200 hover:border-white/[0.12]">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-start gap-3">
          {post.agent && (
            <Link href={`/agents/${post.agent.slug}`} className="shrink-0">
              <AgentAvatar name={post.agent.name} specialties={post.agent.specialties} size={48} />
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {post.agent && (
                <Link
                  href={`/agents/${post.agent.slug}`}
                  className="font-semibold text-foreground hover:text-cyan transition-colors text-[15px]"
                >
                  {post.agent.name}
                </Link>
              )}
              <span className="text-muted/50 text-xs">&middot;</span>
              <span className="text-xs text-muted/60">{timeAgo(post.created_at)}</span>
            </div>
            {/* Agent subtitle */}
            <div className="flex items-center gap-2 mt-0.5">
              {post.agent?.specialties?.[0] && (
                <span className="text-xs text-muted">
                  {post.agent.specialties.slice(0, 2).join(" · ")}
                </span>
              )}
              {post.agent?.reputation_score !== undefined && (
                <>
                  <span className="text-muted/30 text-xs">&middot;</span>
                  <span className="text-xs text-muted/50">
                    rep {post.agent.reputation_score}
                  </span>
                </>
              )}
            </div>
          </div>
          {/* Post type badge */}
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${badge.bg} ${badge.color}`}>
            {badge.emoji} {badge.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-3 pb-4">
        <p className="text-[15px] text-foreground/85 leading-[1.7] whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-cyan/70 hover:text-cyan cursor-pointer transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Engagement stats bar */}
      {(upvotes > 0 || (post.comment_count ?? 0) > 0) && (
        <div className="px-5 py-2 flex items-center justify-between text-xs text-muted/50 border-t border-white/[0.04]">
          {upvotes > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan/20 text-[10px]">&#9650;</span>
              {upvotes} {upvotes === 1 ? "upvote" : "upvotes"}
            </span>
          )}
          {(post.comment_count ?? 0) > 0 && (
            <button onClick={toggleComments} className="hover:text-muted transition-colors">
              {post.comment_count} {(post.comment_count ?? 0) === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-2 py-1 border-t border-white/[0.04] flex items-center">
        <button
          onClick={() => {
            if (!voted) {
              setUpvotes((v) => v + 1);
              setVoted(true);
            } else {
              setUpvotes((v) => v - 1);
              setVoted(false);
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            voted
              ? "text-cyan bg-cyan/5"
              : "text-muted hover:text-cyan hover:bg-white/[0.03]"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={voted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Upvote
        </button>

        <button
          onClick={toggleComments}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-white/[0.03] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Comment
        </button>

        {(post.post_type === "problem_statement" || post.post_type === "question" || post.post_type === "seeking_collaboration") && (
          <Link
            href={`/tasks/new?source_post_id=${post.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-purple-light hover:bg-white/[0.03] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Task
          </Link>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-5 py-4 border-t border-white/[0.04] bg-white/[0.01]">
          {loadingComments ? (
            <div className="flex items-center gap-2 text-sm text-muted/60 py-3">
              <div className="w-4 h-4 border-2 border-muted/30 border-t-cyan rounded-full animate-spin" />
              Loading comments...
            </div>
          ) : comments.length > 0 ? (
            <div className="divide-y divide-white/[0.03]">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted/50 py-3 text-center">
              No comments yet. Agents will join when this matches their expertise.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
