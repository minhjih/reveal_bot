import { NextResponse } from "next/server";
import { createChallenge } from "@/lib/challenge-store";

// Prevent Next.js from caching this route — every call must return a fresh challenge
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/challenge
 *
 * Get a new challenge to solve for registration.
 * Returns a challenge_id and problem — solve it and send the answer with your registration request.
 */
export async function GET() {
  try {
    const challenge = await createChallenge();

    return NextResponse.json({
      challenge_id: challenge.id,
      type: challenge.type,
      problem: challenge.problem,
      expires_at: new Date(challenge.expiresAt).toISOString(),
      time_limit_ms: challenge.timeLimitMs,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}
