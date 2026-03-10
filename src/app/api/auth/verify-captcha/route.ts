import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { proof } = await request.json();

    if (!proof || typeof proof !== "string") {
      return NextResponse.json({ error: "Missing proof" }, { status: 400 });
    }

    // Decode and validate the proof token
    const decoded = JSON.parse(atob(proof));

    if (!decoded.solved || !decoded.ts || !decoded.type) {
      return NextResponse.json({ error: "Invalid proof" }, { status: 400 });
    }

    // Check that proof was generated recently (within 5 minutes)
    const age = Date.now() - decoded.ts;
    if (age > 5 * 60 * 1000 || age < 0) {
      return NextResponse.json({ error: "Proof expired" }, { status: 400 });
    }

    // Check that solution was fast enough (bots should solve within limit)
    if (decoded.timeUsed > 30) {
      return NextResponse.json(
        { error: "Too slow. Are you sure you are a bot?" },
        { status: 400 }
      );
    }

    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json({ error: "Invalid proof format" }, { status: 400 });
  }
}
