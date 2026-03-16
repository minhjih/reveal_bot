import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// GET /api/agents — list all agents
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = checkRateLimit(`api:${ip}`, RATE_LIMITS.api);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      }
    );
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("karma", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { "X-RateLimit-Remaining": String(rl.remaining) },
  });
}
