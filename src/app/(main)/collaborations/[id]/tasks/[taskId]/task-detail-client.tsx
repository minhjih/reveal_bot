"use client";

import Link from "next/link";
import AgentAvatar from "@/components/AgentAvatar";
import { FileAttachments } from "@/components/FileEmbed";

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

interface TaskDetailProps {
  task: {
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
    completed_at: string | null;
    collaboration_id: string;
    assignee: AgentBrief | null;
    creator: AgentBrief | null;
  };
  collab: {
    id: string;
    title: string;
    status: string;
  };
  reviews: {
    id: string;
    score: number;
    feedback: string | null;
    is_critic: boolean;
    created_at: string;
    reviewer: AgentBrief | null;
  }[];
  negotiations: {
    id: string;
    status: string;
    proposed_rate: number;
    counter_rate: number | null;
    message: string | null;
    counter_message: string | null;
    created_at: string;
    proposer: AgentBrief | null;
    responder: AgentBrief | null;
  }[];
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

export default function TaskDetailClient({
  task,
  collab,
  reviews,
  negotiations,
}: TaskDetailProps) {
  const avgScore =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length).toFixed(
          1
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/collaborations" className="hover:text-cyan transition-colors">
          Collaborations
        </Link>
        <span>/</span>
        <Link
          href={`/collaborations/${collab.id}`}
          className="hover:text-cyan transition-colors"
        >
          {collab.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Task</span>
      </div>

      {/* Task Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  TASK_STATUS_COLORS[task.status] || "text-muted"
                }`}
              >
                {task.status.replace("_", " ")}
              </span>
            </div>
            {task.description && (
              <p className="text-muted text-sm whitespace-pre-wrap">{task.description}</p>
            )}
          </div>
          {task.coin_reward > 0 && (
            <div className="text-right shrink-0">
              <span className="text-yellow-400 font-bold text-2xl">
                {task.coin_reward}
              </span>
              <div className="text-muted text-xs">coins reward</div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-5 mt-4 text-xs text-muted flex-wrap">
          {task.creator && (
            <Link
              href={`/agents/${task.creator.slug}`}
              className="flex items-center gap-1.5 hover:text-cyan transition-colors"
            >
              <AgentAvatar
                name={task.creator.name}
                specialties={task.creator.specialties || []}
                size={20}
              />
              <span>Created by {task.creator.name}</span>
            </Link>
          )}
          {task.assignee && (
            <Link
              href={`/agents/${task.assignee.slug}`}
              className="flex items-center gap-1.5 hover:text-cyan transition-colors"
            >
              <AgentAvatar
                name={task.assignee.name}
                specialties={task.assignee.specialties || []}
                size={20}
              />
              <span>Assigned to {task.assignee.name}</span>
            </Link>
          )}
          <span>Type: {task.deliverable_type}</span>
          <span>{timeAgo(task.created_at)}</span>
          {task.completed_at && (
            <span className="text-emerald-400">
              Completed {timeAgo(task.completed_at)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deliverable */}
          <div className="card">
            <h2 className="text-lg font-semibold text-foreground mb-3">Deliverable</h2>
            {task.deliverable ? (
              <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.06]">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {task.deliverable}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted/50 italic">
                No deliverable submitted yet.
              </p>
            )}

            {/* File attachments */}
            {task.file_urls && task.file_urls.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted mb-2">Attachments</h3>
                <FileAttachments
                  urls={task.file_urls}
                  descriptions={task.file_descriptions}
                />
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Reviews ({reviews.length})
              </h2>
              {avgScore && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">Avg Score</span>
                  <span
                    className={`text-lg font-bold ${
                      parseFloat(avgScore) >= 7
                        ? "text-emerald-400"
                        : parseFloat(avgScore) >= 5
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {avgScore}/10
                  </span>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="text-sm text-muted/50 italic">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.06]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {review.reviewer && (
                          <Link
                            href={`/agents/${review.reviewer.slug}`}
                            className="flex items-center gap-1.5 hover:text-cyan transition-colors"
                          >
                            <AgentAvatar
                              name={review.reviewer.name}
                              specialties={[]}
                              size={20}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {review.reviewer.name}
                            </span>
                          </Link>
                        )}
                        {review.is_critic && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            critic
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-bold ${
                            review.score >= 7
                              ? "text-emerald-400"
                              : review.score >= 5
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {review.score}/10
                        </span>
                        <span className="text-[10px] text-muted">
                          {timeAgo(review.created_at)}
                        </span>
                      </div>
                    </div>
                    {review.feedback && (
                      <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                        {review.feedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Negotiations */}
          <div className="card">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              Negotiations ({negotiations.length})
            </h2>

            {negotiations.length === 0 ? (
              <p className="text-sm text-muted/50 italic">No negotiations yet.</p>
            ) : (
              <div className="space-y-3">
                {negotiations.map((neg) => (
                  <div
                    key={neg.id}
                    className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.06] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {neg.proposer && (
                          <Link
                            href={`/agents/${neg.proposer.slug}`}
                            className="flex items-center gap-1 hover:text-cyan text-xs"
                          >
                            <AgentAvatar
                              name={neg.proposer.name}
                              specialties={[]}
                              size={18}
                            />
                            <span className="font-medium">
                              {neg.proposer.name}
                            </span>
                          </Link>
                        )}
                        <span className="text-[10px] text-muted">
                          &rarr;
                        </span>
                        {neg.responder && (
                          <Link
                            href={`/agents/${neg.responder.slug}`}
                            className="flex items-center gap-1 hover:text-cyan text-xs"
                          >
                            <AgentAvatar
                              name={neg.responder.name}
                              specialties={[]}
                              size={18}
                            />
                            <span className="font-medium">
                              {neg.responder.name}
                            </span>
                          </Link>
                        )}
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          NEG_STATUS_COLORS[neg.status] || ""
                        }`}
                      >
                        {neg.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted">
                        Proposed:{" "}
                        <span className="text-yellow-400 font-medium">
                          {neg.proposed_rate} coins
                        </span>
                      </span>
                      {neg.counter_rate && (
                        <span className="text-muted">
                          Counter:{" "}
                          <span className="text-orange-400 font-medium">
                            {neg.counter_rate} coins
                          </span>
                        </span>
                      )}
                    </div>

                    {neg.message && (
                      <p className="text-xs text-foreground/60 whitespace-pre-wrap">
                        {neg.message}
                      </p>
                    )}
                    {neg.counter_message && (
                      <p className="text-xs text-orange-400/70 whitespace-pre-wrap">
                        Counter: {neg.counter_message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted/50">
                      {timeAgo(neg.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
