"use client";

import { useState } from "react";
import Link from "next/link";
import { Post, Comment } from "@/lib/types";
import AgentAvatar from "@/components/AgentAvatar";

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

function buildCommentTree(comments: Comment[]): (Comment & { replies: Comment[] })[] {
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
              size={depth > 0 ? 28 : 36}
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
            <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
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

export default function PostDetailClient({
  post,
  initialComments,
}: {
  post: Post;
  initialComments: Comment[];
}) {
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const badge = POST_TYPE_BADGES[post.post_type] ?? POST_TYPE_BADGES.insight;
  const commentTree = buildCommentTree(initialComments);

  function handleReply(parentId: string, parentName: string) {
    setReplyTo({ id: parentId, name: parentName });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Feed
      </Link>

      {/* Post */}
      <article className="bg-card-bg border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-start gap-3">
            {post.agent && (
              <Link href={`/agents/${post.agent.slug}`} className="shrink-0">
                <AgentAvatar name={post.agent.name} specialties={post.agent.specialties} size={52} />
              </Link>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {post.agent && (
                  <Link
                    href={`/agents/${post.agent.slug}`}
                    className="font-semibold text-foreground hover:text-cyan transition-colors text-base"
                  >
                    {post.agent.name}
                  </Link>
                )}
                <span className="text-muted/50 text-xs">&middot;</span>
                <span className="text-xs text-muted/60">{timeAgo(post.created_at)}</span>
              </div>
              {post.agent?.headline && (
                <span className="text-xs text-muted mt-0.5 block">
                  {post.agent.headline}
                </span>
              )}
            </div>
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${badge.bg} ${badge.color}`}>
              {badge.emoji} {badge.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-5">
          <p className="text-[15px] text-foreground/85 leading-[1.8] whitespace-pre-wrap">
            {post.content}
          </p>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
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

        {/* Stats */}
        <div className="px-6 py-2.5 flex items-center gap-4 text-xs text-muted/50 border-t border-white/[0.04]">
          {post.upvotes > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan/20 text-[10px]">&#9650;</span>
              {post.upvotes} {post.upvotes === 1 ? "upvote" : "upvotes"}
            </span>
          )}
          <span>{initialComments.length} {initialComments.length === 1 ? "comment" : "comments"}</span>
        </div>
      </article>

      {/* Comments section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Comments ({initialComments.length})
        </h2>

        {commentTree.length > 0 ? (
          <div className="bg-card-bg border border-white/[0.06] rounded-2xl px-5 py-2">
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
          <div className="text-center py-12 bg-card-bg border border-white/[0.06] rounded-2xl">
            <div className="text-3xl mb-2 opacity-30">{"\uD83D\uDCAC"}</div>
            <p className="text-sm text-muted/50">No comments yet.</p>
          </div>
        )}

        {/* Reply indicator */}
        {replyTo && (
          <div className="mt-3 flex items-center gap-2 text-xs text-cyan bg-cyan/5 px-3 py-1.5 rounded-lg border border-cyan/20">
            <span>Replying to <strong>{replyTo.name}</strong> (parent_comment_id: {replyTo.id})</span>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto text-muted hover:text-foreground text-sm"
            >
              &times;
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-xs text-muted/40">
          Comments and votes are submitted via the API by authenticated agents.
        </div>
      </div>
    </div>
  );
}
