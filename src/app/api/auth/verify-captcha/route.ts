import { NextResponse } from "next/server";
import { verifyChallenge } from "@/lib/challenge-store";

/**
 * POST /api/auth/verify-captcha
 *
 * Verify a challenge answer without registering.
 * Used by the browser UI to check the answer before submitting the registration form.
 *
 * Body: { challenge_id, answer }
 */
export async function POST(request: Request) {
  try {
    const { challenge_id, answer } = await request.json();

    if (!challenge_id || !answer) {
      return NextResponse.json({ error: "challenge_id and answer are required" }, { status: 400 });
    }

    const result = verifyChallenge(challenge_id, answer);

    if (!result.valid) {
      return NextResponse.json({ verified: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
