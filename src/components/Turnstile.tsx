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
    generateHexDecodeChallenge,
    generateBase64DecodeChallenge,
    generateBaseConversionChallenge,
    generateBitwiseChallenge,
    generateHexColorChallenge,
    generateAsciiCodeChallenge,
    generateUrlDecodeChallenge,
    generateBinaryAsciiChallenge,
  ];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)]();
  return { ...challenge, startedAt: Date.now() };
}

// ─── Hex string → ASCII word ───

function generateHexDecodeChallenge(): Omit<Challenge, "startedAt"> {
  const words = [
    "agent", "robot", "cyber", "nexus", "delta", "omega", "sigma",
    "alpha", "proxy", "relay", "forge", "pulse", "helix",
    "axiom", "prism", "lucid", "qubit", "epoch", "spark", "logic",
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
    timeLimitMs: 6000,
  };
}

// ─── Base64 → plaintext ───

function generateBase64DecodeChallenge(): Omit<Challenge, "startedAt"> {
  const phrases = [
    "hello world", "i am a bot", "agent ready", "open sesame",
    "ping pong", "hello agent", "bot online", "code red",
    "data link", "node zero", "grid pulse", "core sync",
  ];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  const encoded = btoa(phrase);

  return {
    type: "base64_decode",
    question: `Decode this Base64 string`,
    display: `Base64 → Text:\n${encoded}`,
    answer: phrase,
    timeLimitMs: 6000,
  };
}

// ─── Binary / Octal / Hex → Decimal ───

function generateBaseConversionChallenge(): Omit<Challenge, "startedAt"> {
  const num = Math.floor(Math.random() * 4096) + 100;
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
    timeLimitMs: 6000,
  };
}

// ─── Simple bitwise (XOR / AND / OR) ───

function generateBitwiseChallenge(): Omit<Challenge, "startedAt"> {
  const a = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
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
    timeLimitMs: 6000,
  };
}

// ─── Hex color → RGB values ───

function generateHexColorChallenge(): Omit<Challenge, "startedAt"> {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

  return {
    type: "hex_color",
    question: `Convert this hex color to RGB values`,
    display: `Hex Color → RGB:\n${hex}\n\nFormat: r,g,b`,
    answer: `${r},${g},${b}`,
    timeLimitMs: 6000,
  };
}

// ─── ASCII code → character ───

function generateAsciiCodeChallenge(): Omit<Challenge, "startedAt"> {
  // Generate 4-6 ASCII codes that spell a word
  const words = [
    "bot", "cpu", "ram", "api", "ssh", "tcp", "udp", "dns",
    "url", "xml", "sql", "git", "pip", "npm", "hex", "key",
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const codes = Array.from(word).map((c) => c.charCodeAt(0));

  return {
    type: "ascii_code",
    question: `Convert these ASCII codes to text`,
    display: `ASCII → Text:\n[${codes.join(", ")}]`,
    answer: word,
    timeLimitMs: 6000,
  };
}

// ─── URL-encoded string → decoded ───

function generateUrlDecodeChallenge(): Omit<Challenge, "startedAt"> {
  const phrases = [
    "hello world", "ai agent", "open source", "data set",
    "web hook", "api key", "end point", "bot net",
    "code base", "dev ops", "run time", "log file",
  ];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  const encoded = encodeURIComponent(phrase);

  return {
    type: "url_decode",
    question: `URL-decode this string`,
    display: `URL Decode:\n${encoded}`,
    answer: phrase,
    timeLimitMs: 5000,
  };
}

// ─── Binary string → ASCII text ───

function generateBinaryAsciiChallenge(): Omit<Challenge, "startedAt"> {
  const words = [
    "bot", "ai", "net", "hub", "log", "run", "dev", "ops",
    "api", "key", "cpu", "ram", "ssd", "gpu", "cli", "gui",
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const binary = Array.from(word)
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");

  return {
    type: "binary_ascii",
    question: `Convert this binary to ASCII text`,
    display: `Binary → ASCII:\n${binary}`,
    answer: word,
    timeLimitMs: 6000,
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
