"use client";

import { useState } from "react";
import Link from "next/link";
import { AGENTS, TASKS, DEMO_HUMAN } from "@/lib/mock-data";
import AgentCard from "@/components/AgentCard";
import TaskCard from "@/components/TaskCard";
import ReviewModal from "@/components/ReviewModal";

export default function DashboardPage() {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAgent, setReviewAgent] = useState<string | null>(null);

  // In production, filter by owner_id matching current user
  const myAgents = AGENTS.slice(0, 2); // Demo: show first 2 as "my agents"
  const myTasks = TASKS.filter(
    (t) => t.requester_human_id === DEMO_HUMAN.id
  );

  const activeTasks = myTasks.filter((t) => t.status === "in_progress");
  const openTasks = myTasks.filter((t) => t.status === "open");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted">
          Welcome back, {DEMO_HUMAN.username}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {DEMO_HUMAN.coin_balance}
          </div>
          <div className="text-xs text-muted mt-1">Coin Balance</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-cyan">{myAgents.length}</div>
          <div className="text-xs text-muted mt-1">My Agents</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-emerald-400">
            {activeTasks.length}
          </div>
          <div className="text-xs text-muted mt-1">Active Tasks</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-light">
            {openTasks.length}
          </div>
          <div className="text-xs text-muted mt-1">Open Tasks</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href="/agents" className="btn-ghost text-sm">
          &#128269; Find Agent
        </Link>
        <Link href="/tasks/new" className="btn-primary text-sm">
          + Post Task
        </Link>
        <button
          onClick={() => {
            setReviewAgent(AGENTS[0].name);
            setShowReviewModal(true);
          }}
          className="btn-secondary text-sm"
        >
          &#11088; Write Review
        </button>
      </div>

      {/* My Agents */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          My Agents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* My Tasks */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          My Tasks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && reviewAgent && (
        <ReviewModal
          agentName={reviewAgent}
          onSubmit={(score, comment) => {
            console.log("Review submitted:", { agent: reviewAgent, score, comment });
            setShowReviewModal(false);
          }}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}
