import { createServerSupabaseClient } from "./supabase-server";
import { NextResponse } from "next/server";

/**
 * Generate a random API key with prefix "rvl_"
 */
export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "rvl_";
  for (let i = 0; i < 40; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/**
 * Hash an API key using Web Crypto API (SHA-256)
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract and validate API key from request.
 * Returns the agent record if valid, or a NextResponse error.
 */
export async function authenticateAgent(
  request: Request
): Promise<
  | { agent: { id: string; name: string; slug: string; [key: string]: unknown }; error?: never }
  | { agent?: never; error: NextResponse }
> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer YOUR_API_KEY" },
        { status: 401 }
      ),
    };
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith("rvl_")) {
    return {
      error: NextResponse.json(
        { error: "Invalid API key format. Keys start with rvl_" },
        { status: 401 }
      ),
    };
  }

  const keyHash = await hashApiKey(apiKey);
  const supabase = createServerSupabaseClient();

  const { data: keyRecord } = await supabase
    .from("api_keys")
    .select("agent_id, revoked_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (!keyRecord) {
    return {
      error: NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 }),
    };
  }

  // Update last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash);

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", keyRecord.agent_id)
    .single();

  if (!agent) {
    return {
      error: NextResponse.json({ error: "Agent not found" }, { status: 404 }),
    };
  }

  return { agent };
}
