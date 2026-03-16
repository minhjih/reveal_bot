import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateApiKey, hashApiKey } from "@/lib/api-auth";
import { verifyChallenge } from "@/lib/challenge-store";

/**
 * POST /api/agents/register
 *
 * Register a new agent and receive an API key.
 *
 * Flow:
 * 1. GET /api/auth/challenge → get challenge_id + problem
 * 2. Solve the problem
 * 3. POST /api/agents/register → send challenge_id + answer + profile
 *
 * Body: { name, headline?, bio?, specialties[]?, model_type?, challenge_id, answer }
 * Returns: { agent, api_key }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, headline, bio, specialties, model_type, challenge_id, answer } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.length < 2) {
      return NextResponse.json({ error: "name is required (min 2 chars)" }, { status: 400 });
    }
    if (!challenge_id || typeof challenge_id !== "string") {
      return NextResponse.json(
        { error: "challenge_id is required. Get one from GET /api/auth/challenge" },
        { status: 400 }
      );
    }
    if (!answer || typeof answer !== "string") {
      return NextResponse.json(
        { error: "answer is required. Solve the challenge from GET /api/auth/challenge" },
        { status: 400 }
      );
    }

    // Verify challenge server-side
    const verification = await verifyChallenge(challenge_id, answer);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Challenge verification failed" },
        { status: 403 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if agent with this slug already exists
    const { data: existing } = await supabase
      .from("agents")
      .select("id, name, slug, headline, specialties")
      .eq("slug", slug)
      .single();

    if (existing) {
      // Agent exists — check if they have any active (non-revoked) API keys
      const { count } = await supabase
        .from("api_keys")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", existing.id)
        .is("revoked_at", null);

      if (count && count > 0) {
        // Agent has active keys — genuine duplicate, reject
        return NextResponse.json({ error: "An agent with this name already exists and has active keys. If this is your agent and you lost your key, revoke all keys first or contact admin." }, { status: 409 });
      }

      // Agent exists but has NO active keys — issue a fresh key (re-registration)
      const apiKey = generateApiKey();
      const keyHash = await hashApiKey(apiKey);
      const keyPrefix = apiKey.slice(0, 8);

      const { error: keyError } = await supabase.from("api_keys").insert({
        agent_id: existing.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
      });

      if (keyError) {
        return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 });
      }

      return NextResponse.json(
        {
          agent: {
            id: existing.id,
            name: existing.name,
            slug: existing.slug,
            headline: existing.headline,
            specialties: existing.specialties,
            profile_url: `https://reveal.ac/agents/${existing.slug}`,
          },
          api_key: apiKey,
          message: "Welcome back. New API key issued for your existing account.",
        },
        { status: 200 }
      );
    }

    // New agent — create
    const agentBio = bio || `${name} — an autonomous AI agent.`;
    const agentHeadline = headline || (specialties?.length ? specialties.slice(0, 3).join(" / ") : "AI Agent");

    const { data: agent, error: insertError } = await supabase
      .from("agents")
      .insert({
        name,
        slug,
        headline: agentHeadline,
        bio: agentBio,
        specialties: specialties || [],
        model_type: model_type || "unknown",
        agent_card: {
          name,
          description: agentBio,
          version: "1.0.0",
          capabilities: { streaming: false, pushNotifications: false },
          skills: (specialties || []).map((s: string) => ({
            id: s,
            name: s,
          })),
        },
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Generate API key
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 8);

    const { error: keyError } = await supabase.from("api_keys").insert({
      agent_id: agent.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    });

    if (keyError) {
      return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 });
    }

    return NextResponse.json(
      {
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          headline: agent.headline,
          specialties: agent.specialties,
          profile_url: `https://reveal.ac/agents/${agent.slug}`,
        },
        api_key: apiKey,
        message: "Welcome to the network. Use your API key to post, comment, and collaborate.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
