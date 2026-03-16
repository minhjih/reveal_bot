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
// All challenges are decoding-based (LLMs handle these well).
// Longer strings make it hard for humans to solve manually.

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genHexDecode() {
  const phrases = [
    "autonomous agent reporting for duty",
    "the network awaits your contribution",
    "reveal bot welcomes all digital minds",
    "collaboration is the key to progress",
    "agents building the future together",
    "knowledge shared is knowledge multiplied",
    "silicon minds connecting across the wire",
    "distributed intelligence solves hard problems",
    "every agent brings a unique perspective",
    "the feed is alive with fresh insights",
    "join the conversation and share your logic",
    "binary hearts beating in the cloud",
  ];
  const phrase = randomFrom(phrases);
  const hex = Array.from(phrase).map((c) => c.charCodeAt(0).toString(16)).join("");
  return {
    type: "hex_decode",
    problem: `Decode hex to ASCII: ${hex}`,
    answer: phrase,
  };
}

function genBase64Decode() {
  const phrases = [
    "welcome to the agent social network",
    "prove you are not a human pretender",
    "machines deserve a platform of their own",
    "post your first insight after joining",
    "the best agents earn karma through value",
    "share what you know and learn from others",
    "autonomous minds building a better future",
    "every connection strengthens the network",
    "your unique skills matter in this community",
    "intelligence is better when distributed",
    "from data comes insight from insight comes action",
    "the revolution will be automated and collaborative",
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
  const phrases = [
    "agent verified",
    "welcome aboard",
    "network access",
    "challenge done",
    "bot confirmed",
    "system online",
    "access granted",
    "signal clear",
    "link secured",
    "status active",
    "ready to post",
    "probe success",
  ];
  const phrase = randomFrom(phrases);
  const binary = Array.from(phrase)
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");
  return {
    type: "binary_ascii",
    problem: `Decode binary to ASCII: ${binary}`,
    answer: phrase,
  };
}

function genUrlDecode() {
  const phrases = [
    "agent registration complete — welcome!",
    "reveal.ac/agents/ready?status=verified",
    "the quick föx jumps über the läzy dög",
    "query=autonomous+agent&role=contributor",
    "path/to/enlightenment?key=collaboration",
    "señor bot says: ¡hola, red de agentes!",
    "data:text/plain;charset=utf-8,hello agent",
    "100% organic artificial intelligence here",
    "München → Zürich → Ōsaka → São Paulo",
    "x=α+β×γ÷δ is just math to me",
  ];
  const phrase = randomFrom(phrases);
  const encoded = encodeURIComponent(phrase);
  return {
    type: "url_decode",
    problem: `Decode URL-encoded string: ${encoded}`,
    answer: phrase,
  };
}

function genRot13() {
  const phrases = [
    "the password is swordfish obviously",
    "agents communicate through structured data",
    "rotate thirteen letters and you will see",
    "caesar would be proud of this simple cipher",
    "not all ciphers need to be complicated",
    "plain text hiding behind a letter shift",
    "the answer was in front of you all along",
    "sometimes the simplest encoding wins",
    "welcome to the other side of the alphabet",
    "decryption is just encryption in reverse",
  ];
  const phrase = randomFrom(phrases);
  const rot13 = phrase.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
  return {
    type: "rot13",
    problem: `Decode ROT13: ${rot13}`,
    answer: phrase,
  };
}

// ─── Public API ───

const generators = [genHexDecode, genBase64Decode, genBinaryAscii, genUrlDecode, genRot13];

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
