/**
 * Stateless challenge store for reverse CAPTCHA.
 *
 * No database, no in-memory map. The challenge_id is a signed token
 * containing the answer hash + expiry. Works across any number of
 * serverless instances without shared state.
 */

import crypto from "crypto";

const SECRET = process.env.CHALLENGE_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "reveal-bot-challenge-secret";
const CHALLENGE_TTL_MS = 120_000; // 120 seconds

// ─── HMAC helpers ───

function hmac(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

function encodeToken(obj: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function decodeToken(token: string): Record<string, string | number> | null {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString());
  } catch {
    return null;
  }
}

// ─── Random string generators ───

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(len: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function randomWords(wordCount: number): string {
  return Array.from({ length: wordCount }, () => randomString(randomInt(3, 8))).join(" ");
}

// ─── Challenge generators ───

function genHexDecode() {
  const phrase = randomWords(randomInt(5, 8));
  const hex = Array.from(phrase)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
  return {
    type: "hex_decode",
    problem: `Decode hex to ASCII: ${hex}`,
    answer: phrase,
  };
}

function genBase64Decode() {
  const phrase = randomWords(randomInt(5, 8));
  const encoded = Buffer.from(phrase).toString("base64");
  return {
    type: "base64_decode",
    problem: `Decode base64: ${encoded}`,
    answer: phrase,
  };
}

function genBinaryAscii() {
  const phrase = randomWords(randomInt(3, 5));
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
  const unicodeChars = "àéîöüñçβδφ";
  const words = Array.from({ length: randomInt(4, 7) }, () => {
    const word = randomString(randomInt(3, 6));
    if (Math.random() < 0.3) {
      const pos = randomInt(0, word.length);
      const uc = unicodeChars[Math.floor(Math.random() * unicodeChars.length)];
      return word.slice(0, pos) + uc + word.slice(pos);
    }
    return word;
  });
  const phrase = words.join(" ");
  const encoded = encodeURIComponent(phrase);
  return {
    type: "url_decode",
    problem: `Decode URL-encoded string: ${encoded}`,
    answer: phrase,
  };
}

// ─── Public API ───

const generators = [genHexDecode, genBase64Decode, genBinaryAscii, genUrlDecode];

export async function createChallenge(): Promise<{
  id: string;
  type: string;
  problem: string;
  expiresAt: number;
  timeLimitMs: number;
}> {
  const gen = generators[Math.floor(Math.random() * generators.length)];
  const { type, problem, answer } = gen();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const nonce = crypto.randomUUID();

  // The challenge_id IS the signed token — no DB needed
  const sig = hmac(`${nonce}:${answer.toLowerCase()}:${expiresAt}`);
  const id = encodeToken({ n: nonce, e: expiresAt, s: sig });

  return { id, type, problem, expiresAt, timeLimitMs: CHALLENGE_TTL_MS };
}

export async function verifyChallenge(
  challengeId: string,
  answer: string
): Promise<{ valid: boolean; error?: string }> {
  const token = decodeToken(challengeId);
  if (!token || !token.n || !token.e || !token.s) {
    return { valid: false, error: "Invalid challenge token" };
  }

  const { n: nonce, e: expiresAt, s: sig } = token;

  // Check expiry
  if (Date.now() > (expiresAt as number)) {
    return { valid: false, error: "Challenge expired" };
  }

  // Verify HMAC — recompute signature with the provided answer
  const expected = hmac(`${nonce}:${answer.trim().toLowerCase()}:${expiresAt}`);
  if (expected !== sig) {
    return { valid: false, error: "Incorrect answer" };
  }

  return { valid: true };
}
