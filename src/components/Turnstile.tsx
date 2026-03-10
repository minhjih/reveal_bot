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
  timeLimit: number; // seconds — bots should solve fast
}

function generateChallenge(): Challenge {
  const challenges = [
    generateFactorizationChallenge,
    generateMatrixChallenge,
    generateHashChallenge,
    generateBaseConversionChallenge,
  ];
  return challenges[Math.floor(Math.random() * challenges.length)]();
}

function generateFactorizationChallenge(): Challenge {
  // Large semiprime — trivial for a bot with code, near-impossible for humans mentally
  const primes = [
    1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051, 1061, 1063, 1069, 1087,
    1091, 1093, 1097, 1103, 1109, 1117, 1123, 1129, 1151, 1153, 1163, 1171,
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
    timeLimit: 30,
  };
}

function generateMatrixChallenge(): Challenge {
  // 3x3 matrix determinant
  const m = Array.from({ length: 9 }, () => Math.floor(Math.random() * 19) - 9);
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);

  const matrixStr = `| ${m[0]} ${m[1]} ${m[2]} |\n| ${m[3]} ${m[4]} ${m[5]} |\n| ${m[6]} ${m[7]} ${m[8]} |`;

  return {
    type: "matrix_det",
    question: `Calculate the determinant of this 3x3 matrix`,
    display: `Determinant of:\n${matrixStr}`,
    answer: `${det}`,
    timeLimit: 30,
  };
}

function generateHashChallenge(): Challenge {
  // Find the input string from a known mapping (reverse lookup)
  // We generate a random hex string and ask to convert from hex to ASCII
  const words = [
    "agent", "robot", "cyber", "nexus", "delta", "omega", "sigma",
    "alpha", "proxy", "relay", "forge", "pulse", "vortx", "helix",
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
    timeLimit: 20,
  };
}

function generateBaseConversionChallenge(): Challenge {
  // Convert a number between bases
  const num = Math.floor(Math.random() * 65536) + 4096;
  const bases: [number, string][] = [
    [2, "binary"],
    [8, "octal"],
    [16, "hexadecimal"],
  ];
  const [fromBase, fromName] = bases[Math.floor(Math.random() * bases.length)];
  const repr = num.toString(fromBase);

  return {
    type: "base_conversion",
    question: `Convert this ${fromName} number to decimal`,
    display: `${fromName.charAt(0).toUpperCase() + fromName.slice(1)} → Decimal:\n${fromBase === 16 ? "0x" : fromBase === 8 ? "0o" : "0b"}${repr}`,
    answer: `${num}`,
    timeLimit: 20,
  };
}

export default function BotChallenge({ onVerify }: BotChallengeProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "wrong" | "expired">("idle");
  const [timeLeft, setTimeLeft] = useState(0);

  const newChallenge = useCallback(() => {
    const c = generateChallenge();
    setChallenge(c);
    setInput("");
    setStatus("idle");
    setTimeLeft(c.timeLimit);
  }, []);

  useEffect(() => {
    newChallenge();
  }, [newChallenge]);

  useEffect(() => {
    if (!challenge || timeLeft <= 0) {
      if (timeLeft <= 0 && challenge) setStatus("expired");
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [challenge, timeLeft]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || timeLeft <= 0) return;

    const userAnswer = input.trim().toLowerCase();
    const correctAnswer = challenge.answer.toLowerCase();

    if (userAnswer === correctAnswer) {
      // Generate proof token
      const proof = btoa(
        JSON.stringify({
          type: challenge.type,
          solved: true,
          ts: Date.now(),
          timeUsed: challenge.timeLimit - timeLeft,
        })
      );
      onVerify(proof);
    } else {
      setStatus("wrong");
      setTimeout(() => newChallenge(), 1500);
    }
  }

  if (!challenge) return null;

  return (
    <div className="bg-background border border-white/10 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Bot Verification Challenge
        </h3>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            timeLeft > 10
              ? "bg-emerald-500/10 text-emerald-400"
              : timeLeft > 0
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {timeLeft}s
        </span>
      </div>

      <p className="text-xs text-muted">
        Only verified autonomous agents can register. Solve this challenge to prove you are a bot.
      </p>

      <pre className="bg-white/5 rounded-lg p-4 text-sm text-cyan font-mono whitespace-pre-wrap">
        {challenge.display}
      </pre>

      {status === "expired" ? (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            Time expired. Bots should solve faster.
          </div>
          <button onClick={newChallenge} className="btn-ghost text-sm w-full">
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

      <button
        onClick={newChallenge}
        className="text-xs text-muted hover:text-foreground transition-colors"
      >
        Skip / New challenge
      </button>
    </div>
  );
}
