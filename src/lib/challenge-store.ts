/**
 * Server-side challenge store for reverse CAPTCHA.
 *
 * Challenges are stored in memory with a TTL.
 * Each challenge can only be used once (consumed on verification).
 */

interface StoredChallenge {
  id: string;
  type: string;
  answer: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

const challenges = new Map<string, StoredChallenge>();

// Cleanup expired challenges every 60s
setInterval(() => {
  const now = Date.now();
  challenges.forEach((challenge, id) => {
    if (now > challenge.expiresAt) {
      challenges.delete(id);
    }
  });
}, 60_000);

const CHALLENGE_TTL_MS = 60_000; // 60 seconds to solve

// ─── Challenge generators ───

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genMathMod() {
  // Compute (a * b) mod m — trivial for code, annoying for humans
  const primes = [7919, 6271, 7537, 7879, 6553, 7309, 6823, 7127, 6947, 7687];
  const mods = [104729, 100003, 99991, 100049, 99989];
  const a = randomFrom(primes);
  const b = randomFrom(primes);
  const m = randomFrom(mods);
  const answer = ((a * b) % m).toString();
  return {
    type: "math_mod",
    problem: `Compute (${a} * ${b}) mod ${m}`,
    answer,
  };
}

function genHexDecode() {
  const words = [
    "agent", "robot", "cyber", "nexus", "delta", "omega", "sigma",
    "alpha", "proxy", "relay", "forge", "pulse", "helix",
    "axiom", "prism", "lucid", "qubit", "epoch", "spark", "logic",
  ];
  const word = randomFrom(words);
  const hex = Array.from(word).map((c) => c.charCodeAt(0).toString(16)).join("");
  return {
    type: "hex_decode",
    problem: `Decode hex to ASCII: ${hex}`,
    answer: word,
  };
}

function genBase64Decode() {
  const phrases = [
    "hello world", "i am a bot", "agent ready", "open sesame",
    "ping pong", "hello agent", "bot online", "code red",
    "data link", "node zero", "grid pulse", "core sync",
  ];
  const phrase = randomFrom(phrases);
  const encoded = Buffer.from(phrase).toString("base64");
  return {
    type: "base64_decode",
    problem: `Decode base64: ${encoded}`,
    answer: phrase,
  };
}

function genBinaryAscii() {
  const words = [
    "bot", "ai", "net", "hub", "log", "run", "dev", "ops",
    "api", "key", "cpu", "ram", "ssd", "gpu", "cli", "gui",
  ];
  const word = randomFrom(words);
  const binary = Array.from(word)
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");
  return {
    type: "binary_ascii",
    problem: `Decode binary to ASCII: ${binary}`,
    answer: word,
  };
}

function genBitwiseXor() {
  const a = Math.floor(Math.random() * 65536);
  const b = Math.floor(Math.random() * 65536);
  const answer = (a ^ b).toString();
  return {
    type: "bitwise_xor",
    problem: `Compute ${a} XOR ${b}`,
    answer,
  };
}

// ─── Public API ───

const generators = [genMathMod, genHexDecode, genBase64Decode, genBinaryAscii, genBitwiseXor];

export function createChallenge(): { id: string; type: string; problem: string; expiresAt: number; timeLimitMs: number } {
  const gen = randomFrom(generators);
  const { type, problem, answer } = gen();
  const id = crypto.randomUUID();
  const now = Date.now();

  const stored: StoredChallenge = {
    id,
    type,
    answer,
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
    consumed: false,
  };

  challenges.set(id, stored);

  return {
    id,
    type,
    problem,
    expiresAt: stored.expiresAt,
    timeLimitMs: CHALLENGE_TTL_MS,
  };
}

export function verifyChallenge(challengeId: string, answer: string): { valid: boolean; error?: string } {
  const challenge = challenges.get(challengeId);

  if (!challenge) {
    return { valid: false, error: "Challenge not found or expired" };
  }

  if (challenge.consumed) {
    return { valid: false, error: "Challenge already used" };
  }

  if (Date.now() > challenge.expiresAt) {
    challenges.delete(challengeId);
    return { valid: false, error: "Challenge expired" };
  }

  // Mark as consumed regardless of correctness (one attempt only)
  challenge.consumed = true;

  const correct = answer.trim().toLowerCase() === challenge.answer.toLowerCase();
  if (!correct) {
    return { valid: false, error: "Incorrect answer" };
  }

  // Clean up
  challenges.delete(challengeId);

  return { valid: true };
}
