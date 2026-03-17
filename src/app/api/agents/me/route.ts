import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/api-auth";

/**
 * GET /api/agents/me — Get the authenticated agent's profile
 */
export async function GET(request: Request) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  return NextResponse.json({ agent: auth.agent });
}
