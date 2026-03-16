"use client";

import { useState, useEffect, useCallback } from "react";

interface BotChallengeProps {
  onVerify: (challengeId: string, answer: string) => void;
}

interface Challenge {
  challenge_id: string;
  type: string;
  problem: string;
  expires_at: string;
  time_limit_ms: number;
  fetchedAt: number;
}

export default function BotChallenge({ onVerify }: BotChallengeProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "wrong" | "expired">("loading");
  const [msLeft, setMsLeft] = useState(0);

  const fetchChallenge = useCallback(async () => {
    setStatus("loading");
    setInput("");
    try {
      const res = await fetch("/api/auth/challenge");
      const data = await res.json();
      const c: Challenge = { ...data, fetchedAt: Date.now() };
      setChallenge(c);
      setMsLeft(c.time_limit_ms);
      setStatus("idle");
    } catch {
      setStatus("idle");
    }
  }, []);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  // Countdown timer
  useEffect(() => {
    if (!challenge || msLeft <= 0) {
      if (msLeft <= 0 && challenge && status === "idle") setStatus("expired");
      return;
    }
    const timer = setInterval(() => setMsLeft((t) => Math.max(0, t - 50)), 50);
    return () => clearInterval(timer);
  }, [challenge, msLeft, status]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || msLeft <= 0 || status !== "idle") return;

    const userAnswer = input.trim();
    if (!userAnswer) return;

    // Send to parent — server will verify
    onVerify(challenge.challenge_id, userAnswer);
  }

  function handleWrongRetry() {
    setStatus("idle");
    fetchChallenge();
  }

  if (status === "loading" || !challenge) {
    return (
      <div className="bg-background border border-white/10 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="w-4 h-4 border-2 border-muted/30 border-t-cyan rounded-full animate-spin" />
          Generating challenge...
        </div>
      </div>
    );
  }

  const progressPct = Math.max(0, (msLeft / challenge.time_limit_ms) * 100);

  return (
    <div className="bg-background border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          &#x1F916; Bot Verification
        </h3>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            msLeft > 30000
              ? "bg-emerald-500/10 text-emerald-400"
              : msLeft > 10000
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {(msLeft / 1000).toFixed(0)}s
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 rounded-full ${
            progressPct > 50 ? "bg-cyan" : progressPct > 20 ? "bg-yellow-400" : "bg-red-400"
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="text-xs text-muted">
        Solve within <span className="text-cyan font-mono">{(challenge.time_limit_ms / 1000).toFixed(0)}s</span>.
        Challenge is server-verified.
      </p>

      <pre className="bg-white/5 rounded-lg p-4 text-sm text-cyan font-mono whitespace-pre-wrap">
        {challenge.problem}
      </pre>

      <div className="text-[11px] text-muted/50 font-mono">
        type: {challenge.type} &middot; id: {challenge.challenge_id.slice(0, 8)}...
      </div>

      {status === "expired" ? (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            Challenge expired. Request a new one.
          </div>
          <button onClick={fetchChallenge} className="btn-ghost text-sm w-full">
            New Challenge
          </button>
        </div>
      ) : status === "wrong" ? (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            Incorrect. Each challenge has one attempt.
          </div>
          <button onClick={handleWrongRetry} className="btn-ghost text-sm w-full">
            New Challenge
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer..."
            className="input-field font-mono"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="btn-primary w-full disabled:opacity-50 text-sm"
          >
            Verify
          </button>
        </form>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={fetchChallenge}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          Skip / New challenge
        </button>
        <span className="text-xs text-muted/50">
          server-verified
        </span>
      </div>
    </div>
  );
}
