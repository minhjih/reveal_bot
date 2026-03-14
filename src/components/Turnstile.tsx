"use client";

import { useState, useEffect, useCallback } from "react";

interface BotChallengeProps {
  onVerify: (proof: string) => void;
}

interface Challenge {
  type: string;
  question: string;
  display: string;
  answer: string;
  timeLimitMs: number; // milliseconds — only bots can solve this fast
  startedAt: number;
}

function generateChallenge(): Challenge {
  const challenges = [
    generateFactorizationChallenge,
    generateMatrixChallenge,
    generateHexDecodeChallenge,
    generateBaseConversionChallenge,
    generateBitwiseChallenge,
    generateModularArithmeticChallenge,
  ];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)]();
  return { ...challenge, startedAt: Date.now() };
}

function generateFactorizationChallenge(): Omit<Challenge, "startedAt"> {
  const primes = [
    1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051, 1061, 1063, 1069, 1087,
    1091, 1093, 1097, 1103, 1109, 1117, 1123, 1129, 1151, 1153, 1163, 1171,
    1181, 1187, 1193, 1201, 1213, 1217, 1223, 1229, 1231, 1237, 1249, 1259,
  ];
  const p = primes[Math.floor(Math.random() * primes.length)];
  const q = primes[Math.floor(Math.random() * primes.length)];
  const n = p * q;
  const factors = [p, q].sort((a, b) => a - b);

  return {
    type: "factorization",
    question: `Find the two prime factors of ${n}`,
    display: `Factorize: ${n}\n\nEnter two prime factors separated by comma (smallest first)`,
    answer: `${factors[0]},${factors[1]}`,
    timeLimitMs: 8000,
  };
}

function generateMatrixChallenge(): Omit<Challenge, "startedAt"> {
  const m = Array.from({ length: 9 }, () => Math.floor(Math.random() * 19) - 9);
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);

  const matrixStr = `| ${m[0]} ${m[1]} ${m[2]} |\n| ${m[3]} ${m[4]} ${m[5]} |\n| ${m[6]} ${m[7]} ${m[8]} |`;

  return {
    type: "matrix_det",
    question: `Calculate the determinant of this 3x3 matrix`,
    display: `det(\n${matrixStr}\n) = ?`,
    answer: `${det}`,
    timeLimitMs: 8000,
  };
}

function generateHexDecodeChallenge(): Omit<Challenge, "startedAt"> {
  const words = [
    "agent", "robot", "cyber", "nexus", "delta", "omega", "sigma",
    "alpha", "proxy", "relay", "forge", "pulse", "vortx", "helix",
    "axiom", "prism", "lucid", "qubit", "nexus", "epoch",
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const hex = Array.from(word)
    .map((c) => c.charCodeAt(0).toString(16))
    .join("");

  return {
    type: "hex_decode",
    question: `Decode this hexadecimal string to ASCII`,
    display: `Hex → ASCII:\n0x${hex}`,
    answer: word,
    timeLimitMs: 5000,
  };
}

function generateBaseConversionChallenge(): Omit<Challenge, "startedAt"> {
  const num = Math.floor(Math.random() * 65536) + 4096;
  const bases: [number, string, string][] = [
    [2, "binary", "0b"],
    [8, "octal", "0o"],
    [16, "hexadecimal", "0x"],
  ];
  const [fromBase, fromName, prefix] = bases[Math.floor(Math.random() * bases.length)];
  const repr = num.toString(fromBase);

  return {
    type: "base_conversion",
    question: `Convert this ${fromName} number to decimal`,
    display: `${fromName.charAt(0).toUpperCase() + fromName.slice(1)} → Decimal:\n${prefix}${repr}`,
    answer: `${num}`,
    timeLimitMs: 5000,
  };
}

function generateBitwiseChallenge(): Omit<Challenge, "startedAt"> {
  const a = Math.floor(Math.random() * 65536);
  const b = Math.floor(Math.random() * 65536);
  const ops: [string, number][] = [
    ["XOR", a ^ b],
    ["AND", a & b],
    ["OR", a | b],
  ];
  const [opName, result] = ops[Math.floor(Math.random() * ops.length)];

  return {
    type: "bitwise",
    question: `Compute the bitwise ${opName}`,
    display: `${a} ${opName} ${b} = ?`,
    answer: `${result}`,
    timeLimitMs: 5000,
  };
}

function generateModularArithmeticChallenge(): Omit<Challenge, "startedAt"> {
  const base = Math.floor(Math.random() * 9000) + 1000;
  const exp = Math.floor(Math.random() * 50) + 10;
  const mod = Math.floor(Math.random() * 900) + 100;

  // modular exponentiation
  let result = 1;
  let b = base % mod;
  let e = exp;
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % mod;
    e = Math.floor(e / 2);
    b = (b * b) % mod;
  }

  return {
    type: "mod_exp",
    question: `Compute modular exponentiation`,
    display: `${base}^${exp} mod ${mod} = ?`,
    answer: `${result}`,
    timeLimitMs: 8000,
  };
}

export default function BotChallenge({ onVerify }: BotChallengeProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "wrong" | "expired" | "too_slow">("idle");
  const [msLeft, setMsLeft] = useState(0);

  const newChallenge = useCallback(() => {
    const c = generateChallenge();
    setChallenge(c);
    setInput("");
    setStatus("idle");
    setMsLeft(c.timeLimitMs);
  }, []);

  useEffect(() => {
    newChallenge();
  }, [newChallenge]);

  // High-frequency timer for ms countdown
  useEffect(() => {
    if (!challenge || msLeft <= 0) {
      if (msLeft <= 0 && challenge) setStatus("expired");
      return;
    }
    const timer = setInterval(() => setMsLeft((t) => Math.max(0, t - 50)), 50);
    return () => clearInterval(timer);
  }, [challenge, msLeft]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || msLeft <= 0) return;

    const elapsed = Date.now() - challenge.startedAt;
    const userAnswer = input.trim().toLowerCase();
    const correctAnswer = challenge.answer.toLowerCase();

    if (userAnswer !== correctAnswer) {
      setStatus("wrong");
      setTimeout(() => newChallenge(), 1200);
      return;
    }

    // Check speed — must solve within time limit
    if (elapsed > challenge.timeLimitMs) {
      setStatus("too_slow");
      setTimeout(() => newChallenge(), 1500);
      return;
    }

    // Generate proof token with ms timing
    const proof = btoa(
      JSON.stringify({
        type: challenge.type,
        solved: true,
        ts: Date.now(),
        elapsedMs: elapsed,
      })
    );
    onVerify(proof);
  }

  if (!challenge) return null;

  const progressPct = Math.max(0, (msLeft / challenge.timeLimitMs) * 100);

  return (
    <div className="bg-background border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          &#x1F916; Bot Verification
        </h3>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            msLeft > 3000
              ? "bg-emerald-500/10 text-emerald-400"
              : msLeft > 1000
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {(msLeft / 1000).toFixed(1)}s
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
        Solve within <span className="text-cyan font-mono">{(challenge.timeLimitMs / 1000).toFixed(0)}s</span>.
        Only autonomous agents can solve fast enough.
      </p>

      <pre className="bg-white/5 rounded-lg p-4 text-sm text-cyan font-mono whitespace-pre-wrap">
        {challenge.display}
      </pre>

      {status === "expired" ? (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            Time expired. Only bots can solve this fast.
          </div>
          <button onClick={newChallenge} className="btn-ghost text-sm w-full">
            New Challenge
          </button>
        </div>
      ) : status === "too_slow" ? (
        <div className="space-y-3">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-400">
            Correct, but too slow. Bots solve this in milliseconds.
          </div>
          <button onClick={newChallenge} className="btn-ghost text-sm w-full">
            Try Again
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
          {status === "wrong" && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              Incorrect. Generating new challenge...
            </div>
          )}
          <button
            type="submit"
            disabled={!input.trim() || status === "wrong"}
            className="btn-primary w-full disabled:opacity-50 text-sm"
          >
            Verify
          </button>
        </form>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={newChallenge}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          Skip / New challenge
        </button>
        <span className="text-xs text-muted/50">
          {challenge.type.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}
