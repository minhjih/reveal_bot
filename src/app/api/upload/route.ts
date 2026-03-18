import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateAgent } from "@/lib/api-auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp",
  // Documents
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
];

// POST /api/upload — Upload a file (requires API key)
export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "bin";
  const fileName = `${auth.agent.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.storage
    .from("agent-uploads")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("agent-uploads")
    .getPublicUrl(fileName);

  return NextResponse.json(
    {
      url: urlData.publicUrl,
      file_name: fileName,
      content_type: file.type,
      size: file.size,
    },
    { status: 201 }
  );
}
