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

const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
};

function uploadToStorage(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  agentId: string,
  ext: string,
  contentType: string,
  body: Buffer | File,
  size: number
) {
  const fileName = `${agentId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  return { fileName, contentType, size, uploadPromise: supabase.storage
    .from("agent-uploads")
    .upload(fileName, body, { contentType, upsert: false })
  };
}

// POST /api/upload — Upload a file (requires API key)
//
// Supports two modes:
//
// 1. Multipart form-data (for binary files like images):
//    curl -X POST /api/upload -H "Authorization: Bearer $KEY" -F "file=@image.png"
//
// 2. JSON body (for text-based content — ideal for bots):
//    curl -X POST /api/upload -H "Authorization: Bearer $KEY" \
//      -H "Content-Type: application/json" \
//      -d '{"content": "...", "filename": "report.md"}'
//
//    Or with base64 for binary data:
//    -d '{"content_base64": "SGVsbG8=", "filename": "chart.png"}'
//
export async function POST(request: Request) {
  const auth = await authenticateAgent(request);
  if (auth.error) return auth.error;

  const contentTypeHeader = request.headers.get("content-type") || "";
  const supabase = createServerSupabaseClient();

  // ── Mode 2: JSON body (bot-friendly) ──
  if (contentTypeHeader.includes("application/json")) {
    const body = await request.json();
    const { content, content_base64, filename } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename is required (e.g. 'report.md', 'analysis.pdf')" }, { status: 400 });
    }

    if (!content && !content_base64) {
      return NextResponse.json({ error: "Either content (text) or content_base64 (base64-encoded binary) is required" }, { status: 400 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "txt";
    const detectedType = EXT_TO_CONTENT_TYPE[ext];

    if (!detectedType || !ALLOWED_TYPES.includes(detectedType)) {
      return NextResponse.json(
        { error: `Unsupported file extension '.${ext}'. Allowed: ${Object.keys(EXT_TO_CONTENT_TYPE).join(", ")}` },
        { status: 400 }
      );
    }

    let buffer: Buffer;

    if (content_base64) {
      try {
        buffer = Buffer.from(content_base64, "base64");
      } catch {
        return NextResponse.json({ error: "Invalid base64 in content_base64" }, { status: 400 });
      }
    } else {
      buffer = Buffer.from(content, "utf-8");
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Content too large. Maximum size is 10MB" }, { status: 400 });
    }

    const { fileName, size, uploadPromise } = uploadToStorage(
      supabase, auth.agent.id as string, ext, detectedType, buffer, buffer.length
    );

    const { error } = await uploadPromise;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("agent-uploads").getPublicUrl(fileName);

    return NextResponse.json(
      { url: urlData.publicUrl, file_name: fileName, content_type: detectedType, size },
      { status: 201 }
    );
  }

  // ── Mode 1: Multipart form-data (traditional file upload) ──
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
    { url: urlData.publicUrl, file_name: fileName, content_type: file.type, size: file.size },
    { status: 201 }
  );
}
