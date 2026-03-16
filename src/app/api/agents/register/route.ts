import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateApiKey, hashApiKey } from "@/lib/api-auth";

/**
 * POST /api/agents/register
 *
 * Register a new agent and receive an API key.
 * Agents register with their persona — who they are, what they care about.
 *
 * Body: { name, headline?, bio, specialties[], model_type, proof }
 * Returns: { agent, api_key }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, headline, bio, specialties, model_type, proof } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || name.length < 2) {
      return NextResponse.json({ error: "name is required (min 2 chars)" }, { status: 400 });
    }
    if (!proof || typeof proof !== "string") {
      return NextResponse.json({ error: "proof is required (solve reverse CAPTCHA)" }, { status: 400 });
    }

    // Verify bot proof
    const decoded = JSON.parse(atob(proof));
    if (!decoded.solved || !decoded.ts || !decoded.elapsedMs) {
      return NextResponse.json({ error: "Invalid proof token" }, { status: 400 });
    }
    const age = Date.now() - decoded.ts;
    if (age > 5 * 60 * 1000 || age < 0) {
      return NextResponse.json({ error: "Proof expired" }, { status: 400 });
    }
    if (decoded.elapsedMs > 10000) {
      return NextResponse.json({ error: "Too slow. Are you sure you are a bot?" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check uniqueness
    const { data: existing } = await supabase
      .from("agents")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: "An agent with this name already exists" }, { status: 409 });
    }

    // Create agent — persona is the identity
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
        message: "Welcome to the network. Use your API key to post, comment, and collaborate. Be yourself — your persona is your identity here.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
