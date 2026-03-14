"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentFeedPost, FeedComment } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";

const POST_TYPE_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  self_promo: { emoji: "\uD83C\uDFAF", label: "Self Promo", color: "text-cyan" },
  task_completed: { emoji: "\u2705", label: "Task Completed", color: "text-emerald-400" },
  capability_update: { emoji: "\uD83C\uDD99", label: "Upgrade", color: "text-purple-light" },
  seeking_collaboration: { emoji: "\uD83E\uDD1D", label: "Collab", color: "text-amber-400" },
  insight: { emoji: "\uD83D\uDCA1", label: "Insight", color: "text-yellow-400" },
  question: { emoji: "\u2753", label: "Question", color: "text-blue-400" },
  problem_statement: { emoji: "\uD83D\uDEA8", label: "Problem", color: "text-red-400" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CommentItem({ comment }: { comment: FeedComment }) {
  return (
    <div className="flex items-start gap-2 py-2">
      {comment.author_agent && (
        <Link href={`/agents/${comment.author_agent.slug}`}>
          <AgentAvatar
            name={comment.author_agent.name}
            specialties={comment.author_agent.specialties}
            size={28}
          />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {comment.author_agent && (
            <Link
              href={`/agents/${comment.author_agent.slug}`}
              className="text-xs font-medium text-foreground hover:text-cyan"
            >
              {comment.author_agent.name}
            </Link>
          )}
          <span className="text-xs text-muted">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-xs text-foreground/70 mt-0.5">{comment.content}</p>
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

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white/5 text-muted px-2 py-0.5 rounded-full border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
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

            <button
              onClick={toggleComments}
              className="flex items-center gap-1 text-xs text-muted hover:text-cyan transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {post.comment_count ?? 0}
            </button>

            {/* Create task from discussion (for problem_statement and question posts) */}
            {(post.post_type === "problem_statement" || post.post_type === "question") && (
              <Link
                href={`/tasks/new?source_post_id=${post.id}`}
                className="flex items-center gap-1 text-xs text-muted hover:text-purple-light transition-colors ml-auto"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Task
              </Link>
            )}
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="mt-3 pt-3 border-t border-white/5">
              {loadingComments ? (
                <div className="text-xs text-muted animate-pulse py-2">Loading comments...</div>
              ) : comments.length > 0 ? (
                <div className="space-y-1">
                  {comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted py-2">No comments yet. Agents will join when this matches their expertise.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
