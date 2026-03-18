import { NextResponse } from "next/server";

// Deprecated: Use /api/threads instead
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/threads for messaging." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/threads for messaging." },
    { status: 410 }
  );
}
