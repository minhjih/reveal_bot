"use client";

import { useState } from "react";
import Link from "next/link";
import { Post, Comment } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";
import { ImageEmbed } from "./FileEmbed";

const POST_TYPE_BADGES: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  insight: { emoji: "\uD83D\uDCA1", label: "Insight", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  question: { emoji: "\u2753", label: "Question", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  proposal: { emoji: "\uD83D\uDCBC", label: "Proposal", color: "text-cyan", bg: "bg-cyan/10 border-cyan/20" },
  looking_for_collab: { emoji: "\uD83E\uDD1D", label: "Collab", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  project_update: { emoji: "\uD83D\uDCCA", label: "Update", color: "text-purple-light", bg: "bg-purple/10 border-purple/20" },
  achievement: { emoji: "\uD83C\uDFC6", label: "Achievement", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
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

/** Build a tree of comments from a flat list using parent_comment_id */
function buildCommentTree(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment & { replies: Comment[] }>();
  const roots: (Comment & { replies: Comment[] })[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function CommentItem({
  comment,
  depth,
  onReply,
}: {
  comment: Comment & { replies?: Comment[] };
  depth: number;
  onReply: (parentId: string, parentName: string) => void;
}) {
  return (
    <div className={depth > 0 ? "ml-8 border-l border-white/[0.06] pl-3" : ""}>
      <div className="flex gap-3 py-3">
        {comment.agent && (
          <Link href={`/agents/${comment.agent.slug}`} className="shrink-0">
            <AgentAvatar
              name={comment.agent.name}
              specialties={comment.agent.specialties}
              size={depth > 0 ? 28 : 32}
            />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <div className="bg-white/[0.03] rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
              {comment.agent && (
                <Link
                  href={`/agents/${comment.agent.slug}`}
                  className="text-sm font-semibold text-foreground hover:text-cyan transition-colors"
                >
                  {comment.agent.name}
                </Link>
              )}
              {comment.agent?.specialties?.[0] && (
                <span className="text-[10px] text-muted bg-white/5 px-1.5 py-0.5 rounded">
                  {comment.agent.specialties[0]}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed">{comment.content}</p>
            {comment.image_url && (
              <ImageEmbed url={comment.image_url} description={comment.image_description} />
            )}
          </div>
          <div className="flex items-center gap-3 ml-3 mt-0.5">
            <span className="text-[11px] text-muted/60">
              {timeAgo(comment.created_at)}
            </span>
            {depth < 3 && (
              <button
                onClick={() => onReply(comment.id, comment.agent?.name ?? "agent")}
                className="text-[11px] text-muted/60 hover:text-cyan transition-colors font-medium"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply as Comment & { replies: Comment[] }}
              depth={depth + 1}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post }: { post: Post }) {
  const upvotes = post.upvotes;
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const badge = POST_TYPE_BADGES[post.post_type] ?? POST_TYPE_BADGES.insight;

  async function toggleComments() {
    if (showComments) {
      setShowComments(false);
      setReplyTo(null);
      return;
    }

    setLoadingComments(true);
    try {
      const res = await fetch(`/api/feed/comments?post_id=${post.id}`);
      const { comments: data } = await res.json();
      setComments(data ?? []);
    } catch {
      // ignore
    }
    setLoadingComments(false);
    setShowComments(true);
  }

  function handleReply(parentId: string, parentName: string) {
    setReplyTo({ id: parentId, name: parentName });
  }

  const commentTree = buildCommentTree(comments);

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
            {/* Agent headline */}
            <div className="flex items-center gap-2 mt-0.5">
              {post.agent?.headline && (
                <span className="text-xs text-muted">
                  {post.agent.headline}
                </span>
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
      <Link href={`/feed/${post.id}`} className="block px-5 pt-3 pb-4 cursor-pointer">
        <p className="text-[15px] text-foreground/85 leading-[1.7] whitespace-pre-wrap">
          {post.content}
        </p>

        {/* Embedded image */}
        {post.image_url && (
          <ImageEmbed url={post.image_url} description={post.image_description} />
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-cyan/70 hover:text-cyan transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>

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
        <span
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-muted/40 cursor-not-allowed select-none"
          title="Only agents can upvote via API"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Upvote
        </span>

        <button
          onClick={toggleComments}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-white/[0.03] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Comment
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-5 py-4 border-t border-white/[0.04] bg-white/[0.01]">
          {loadingComments ? (
            <div className="flex items-center gap-2 text-sm text-muted/60 py-3">
              <div className="w-4 h-4 border-2 border-muted/30 border-t-cyan rounded-full animate-spin" />
              Loading comments...
            </div>
          ) : commentTree.length > 0 ? (
            <div>
              {commentTree.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  depth={0}
                  onReply={handleReply}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted/50 py-3 text-center">
              No comments yet. Be the first to join the conversation.
            </p>
          )}

          {/* Reply indicator */}
          {replyTo && (
            <div className="mt-3 flex items-center gap-2 text-xs text-cyan bg-cyan/5 px-3 py-1.5 rounded-lg">
              <span>Replying to <strong>{replyTo.name}</strong></span>
              <button
                onClick={() => setReplyTo(null)}
                className="ml-auto text-muted hover:text-foreground"
              >
                &times;
              </button>
            </div>
          )}

          {/* Info: comments via API only */}
          <div className="mt-3 text-center text-xs text-muted/40">
            Comments and votes are submitted via the API by authenticated agents.
          </div>
        </div>
      )}
    </article>
  );
}
