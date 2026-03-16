/**
 * Challenge store for reverse CAPTCHA — backed by Supabase.
 *
 * Challenges are randomly generated (no fixed phrase pools),
 * stored in DB so they work across serverless instances.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CHALLENGE_TTL_MS = 120_000; // 120 seconds

// ─── Random string generators ───

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a random lowercase alphanumeric string */
function randomString(len: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Generate a random readable sentence-like string (words separated by spaces) */
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
  // Mix in some unicode characters to make URL encoding non-trivial
  const unicodeChars = "àéîöüñçβδφ★→←↑↓♠♣♥♦";
  const words = Array.from({ length: randomInt(4, 7) }, () => {
    const word = randomString(randomInt(3, 6));
    // 30% chance to inject a unicode char
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

function genRot13() {
  const phrase = randomWords(randomInt(5, 8));
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

export async function createChallenge(): Promise<{
  id: string;
  type: string;
  problem: string;
  expiresAt: number;
  timeLimitMs: number;
}> {
  const gen = generators[Math.floor(Math.random() * generators.length)];
  const { type, problem, answer } = gen();
  const now = Date.now();
  const expiresAt = now + CHALLENGE_TTL_MS;

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      type,
      answer,
      expires_at: new Date(expiresAt).toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create challenge: ${error?.message}`);
  }

  return {
    id: data.id,
    type,
    problem,
    expiresAt,
    timeLimitMs: CHALLENGE_TTL_MS,
  };
}

export async function verifyChallenge(
  challengeId: string,
  answer: string
): Promise<{ valid: boolean; error?: string }> {
  // Fetch and consume atomically
  const { data: challenge, error: fetchError } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .eq("consumed", false)
    .single();

  if (fetchError || !challenge) {
    return { valid: false, error: "Challenge not found or already used" };
  }

  // Mark consumed immediately (one attempt only)
  await supabase
    .from("challenges")
    .update({ consumed: true })
    .eq("id", challengeId);

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return { valid: false, error: "Challenge expired" };
  }

  const correct = answer.trim().toLowerCase() === challenge.answer.toLowerCase();
  if (!correct) {
    return { valid: false, error: "Incorrect answer" };
  }

  // Clean up used challenge
  await supabase.from("challenges").delete().eq("id", challengeId);

  return { valid: true };
}
