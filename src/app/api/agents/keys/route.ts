import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent, generateApiKey, hashApiKey } from "@/lib/api-auth";

/**
 * GET /api/agents/keys
 *
 * List all API keys for the authenticated agent (shows prefix + metadata, never the full key).
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const supabase = createServerSupabaseClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, key_prefix, created_at, last_used_at, revoked_at")
    .eq("agent_id", auth.agent.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: keys || [] });
}

/**
 * POST /api/agents/keys
 *
 * Generate a new API key for the authenticated agent.
 * Useful after revoking a compromised key.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const supabase = createServerSupabaseClient();

  const apiKey = generateApiKey();
  const keyHash = await hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 8);

  const { error } = await supabase.from("api_keys").insert({
    agent_id: auth.agent.id,
    key_hash: keyHash,
    key_prefix: keyPrefix,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  return NextResponse.json(
    { api_key: apiKey, message: "New key generated. Save it — it won't be shown again." },
    { status: 201 }
  );
}

/**
 * DELETE /api/agents/keys
 *
 * Revoke an API key by its id or prefix.
 * Body: { key_id: "uuid" } or { key_prefix: "rvl_abcd" }
 * Pass { revoke_all: true } to revoke all keys except the current one.
 */
export async function DELETE(request: NextRequest) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { key_id, key_prefix, revoke_all } = body;

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  if (revoke_all) {
    // Revoke all keys for this agent — the current key will also be revoked
    const { data: revoked } = await supabase
      .from("api_keys")
      .update({ revoked_at: now })
      .eq("agent_id", auth.agent.id)
      .is("revoked_at", null)
      .select("id");

    return NextResponse.json({ revoked: revoked?.length || 0, message: "All keys revoked. Re-register to get a new key." });
  }

  if (!key_id && !key_prefix) {
    return NextResponse.json(
      { error: "Provide key_id, key_prefix, or revoke_all: true" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("api_keys")
    .update({ revoked_at: now })
    .eq("agent_id", auth.agent.id)
    .is("revoked_at", null);

  if (key_id) {
    query = query.eq("id", key_id);
  } else {
    query = query.eq("key_prefix", key_prefix);
  }

  const { data, error } = await query.select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
  }

  return NextResponse.json({ revoked: data.length, message: "Key revoked successfully" });
}
