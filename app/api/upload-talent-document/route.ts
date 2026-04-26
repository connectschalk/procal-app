/**
 * Private talent verification documents (CV, ID front/back).
 *
 * Storage bucket: talent-documents (private — create in Supabase Dashboard).
 * Paths are not public URLs; preview uses app/api/talent-document-signed-url/route.ts.
 *
 * Accepted types:
 *   CV: PDF, DOC, DOCX
 *   ID front/back: JPG, PNG, WEBP, PDF
 * Max size: 10MB each.
 */

import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { TALENT_DOCUMENTS_BUCKET } from "@/lib/storage-buckets";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const MAX_BYTES = 10 * 1024 * 1024;

const DOC_TYPES = ["cv", "id_front", "id_back"] as const;
type DocType = (typeof DOC_TYPES)[number];

const CV_MIME = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

const ID_MIME = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function columnForType(t: DocType): "cv_document_path" | "id_front_document_path" | "id_back_document_path" {
  if (t === "cv") return "cv_document_path";
  if (t === "id_front") return "id_front_document_path";
  return "id_back_document_path";
}

function extForFile(type: DocType, mime: string): string | null {
  if (type === "cv") return CV_MIME.get(mime) ?? null;
  return ID_MIME.get(mime) ?? null;
}

export async function POST(request: Request) {
  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Server is not configured for uploads" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Expected multipart form data" }, { status: 400 });
  }

  const emailRaw = form.get("email");
  const typeRaw = form.get("type");
  const file = form.get("file");

  if (!isNonEmptyString(emailRaw)) {
    return NextResponse.json({ success: false, error: "email is required" }, { status: 400 });
  }
  if (!isNonEmptyString(typeRaw) || !DOC_TYPES.includes(typeRaw as DocType)) {
    return NextResponse.json(
      { success: false, error: 'type must be "cv", "id_front", or "id_back"' },
      { status: 400 },
    );
  }
  const docType = typeRaw as DocType;

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "file is required" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "File is too large. Max size is 10MB." },
      { status: 400 },
    );
  }

  const ext = extForFile(docType, file.type);
  if (ext == null) {
    return NextResponse.json(
      {
        success: false,
        error:
          docType === "cv"
            ? "Invalid file type. CV allows: pdf, doc, docx."
            : "Invalid file type. ID allows: jpg, jpeg, png, webp, pdf.",
      },
      { status: 400 },
    );
  }

  const email = emailRaw.trim();
  const { data: rows, error: findError } = await admin
    .from("resources")
    .select("id, claimed")
    .ilike("contact_email", email);

  if (findError) {
    console.error("[upload-talent-document] select", findError);
    return NextResponse.json({ success: false, error: "Could not load profile" }, { status: 500 });
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return NextResponse.json({ success: false, error: "No profile found for this email" }, { status: 404 });
  }
  if (list.length > 1) {
    return NextResponse.json(
      { success: false, error: "Multiple profiles use this email; contact support." },
      { status: 409 },
    );
  }

  const row = list[0] as { id: string; claimed: boolean | null };
  if (row.claimed !== true) {
    return NextResponse.json(
      { success: false, error: "Profile must be claimed before uploading documents" },
      { status: 403 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const token = randomBytes(8).toString("hex");
  const objectPath = `${row.id}/${docType}/${Date.now()}-${token}.${ext}`;

  const { error: upErr } = await admin.storage.from(TALENT_DOCUMENTS_BUCKET).upload(objectPath, buf, {
    contentType: file.type,
    upsert: true,
  });

  if (upErr) {
    console.error("[upload-talent-document] storage", upErr);
    const msg = upErr.message?.toLowerCase() ?? "";
    if (msg.includes("bucket") || msg.includes("not found") || upErr.message?.includes("404")) {
      return NextResponse.json(
        {
          success: false,
          error: "Storage bucket talent-documents is missing. Create it in Supabase Storage.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Upload failed. Check bucket permissions and try again." },
      { status: 500 },
    );
  }

  const col = columnForType(docType);
  const { error: dbErr } = await admin.from("resources").update({ [col]: objectPath }).eq("id", row.id);

  if (dbErr) {
    console.error("[upload-talent-document] db", dbErr);
    await admin.storage.from(TALENT_DOCUMENTS_BUCKET).remove([objectPath]).catch(() => {});
    return NextResponse.json({ success: false, error: "Could not save document path" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    path: objectPath,
    type: docType,
  });
}
