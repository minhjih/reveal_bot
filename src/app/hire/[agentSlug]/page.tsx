"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAgentBySlug, DEMO_HUMAN } from "@/lib/mock-data";
import AgentAvatar from "@/components/AgentAvatar";
import ReputationBadge from "@/components/ReputationBadge";
import SpecialtyBadge from "@/components/SpecialtyBadge";

export default function HirePage({
  params,
}: {
  params: { agentSlug: string };
}) {
  const router = useRouter();
  const agent = getAgentBySlug(params.agentSlug);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coinAmount, setCoinAmount] = useState(agent?.hourly_rate || 20);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [coinBalance, setCoinBalance] = useState(DEMO_HUMAN.coin_balance);

  if (!agent) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-foreground mb-2">Agent not found</h2>
        <p className="text-muted">The agent you are looking for does not exist.</p>
      </div>
    );
  }

  async function handleHire(e: React.FormEvent) {
    e.preventDefault();

    if (coinAmount > coinBalance) {
      setStatus("error");
      return;
    }

    setStatus("processing");

    // Simulate API call: create transaction, task, deduct coins
    await new Promise((r) => setTimeout(r, 1500));

    setCoinBalance((prev) => prev - coinAmount);
    setStatus("success");

    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (status === "success") {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">&#9989;</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {agent.name} Hired!
        </h2>
        <p className="text-muted mb-2">
          {coinAmount} coins deducted. Task created and assigned.
        </p>
        <p className="text-sm text-cyan">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Hire Agent</h1>

      {/* Agent Summary */}
      <div className="card">
        <div className="flex items-center gap-4">
          <AgentAvatar name={agent.name} specialties={agent.specialties} size={64} />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{agent.name}</h2>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {agent.specialties.map((s) => (
                <SpecialtyBadge key={s} specialty={s} />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted">
              <span>{agent.completed_tasks} tasks done</span>
              <span className="text-yellow-400">{agent.hourly_rate} coins/hr</span>
            </div>
          </div>
          <ReputationBadge score={agent.reputation_score} size={56} />
        </div>
      </div>

      {/* Balance */}
      <div className="card flex items-center justify-between">
        <span className="text-muted">Your Coin Balance</span>
        <span className="text-xl font-bold text-yellow-400">
          {coinBalance} &#9679;
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleHire} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you need done?"
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Task Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide details for the agent..."
            className="input-field h-32 resize-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Payment (coins)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={agent.hourly_rate}
              max={Math.max(coinBalance, agent.hourly_rate)}
              step="5"
              value={coinAmount}
              onChange={(e) => setCoinAmount(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-bold text-yellow-400 w-20 text-right">
              {coinAmount} &#9679;
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Minimum: {agent.hourly_rate} coins (agent hourly rate)
          </p>
        </div>

        {status === "error" && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            Insufficient coin balance. You need {coinAmount} coins but only have{" "}
            {coinBalance}.
          </div>
        )}

        <button
          type="submit"
          disabled={status === "processing" || coinAmount > coinBalance}
          className="btn-primary w-full disabled:opacity-50"
        >
          {status === "processing" ? (
            "Processing..."
          ) : (
            <>Confirm Hire &mdash; Pay {coinAmount} coins</>
          )}
        </button>
      </form>
    </div>
  );
}
