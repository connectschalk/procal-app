/**
 * Short-lived signed URL for talent (or future admin) to preview/download private documents.
 * Do not use on public profile pages.
 * TODO: Bind to authenticated session + resource ownership; tighten before production.
 */

import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { TALENT_DOCUMENTS_BUCKET } from "@/lib/storage-buckets";
import { NextResponse } from "next/server";

const DOC_TYPES = ["cv", "id_front", "id_back"] as const;
type DocType = (typeof DOC_TYPES)[number];

type Body = { email?: unknown; type?: unknown };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(request: Request) {
  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json({ url: null, error: "Server is not configured" }, { status: 503 });
  }

  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ url: null, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isNonEmptyString(json.email)) {
    return NextResponse.json({ url: null, error: "email is required" }, { status: 400 });
  }
  if (!isNonEmptyString(json.type) || !DOC_TYPES.includes(json.type as DocType)) {
    return NextResponse.json({ url: null, error: "Invalid type" }, { status: 400 });
  }
  const docType = json.type as DocType;

  const email = json.email.trim();
  const { data: rows, error: findError } = await admin
    .from("resources")
    .select("id, claimed, cv_document_path, id_front_document_path, id_back_document_path")
    .ilike("contact_email", email);

  if (findError) {
    return NextResponse.json({ url: null, error: "Could not load profile" }, { status: 500 });
  }

  const list = rows ?? [];
  if (list.length !== 1) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const row = list[0] as {
    id: string;
    claimed: boolean | null;
    cv_document_path: string | null;
    id_front_document_path: string | null;
    id_back_document_path: string | null;
  };
  if (row.claimed !== true) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const pathRaw =
    docType === "cv"
      ? row.cv_document_path
      : docType === "id_front"
        ? row.id_front_document_path
        : row.id_back_document_path;
  const path = pathRaw?.trim();
  if (path == null || path === "") {
    return NextResponse.json({ url: null }, { status: 200 });
  }
  if (!path.startsWith(`${row.id}/`)) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const { data: signed, error: signErr } = await admin.storage.from(TALENT_DOCUMENTS_BUCKET).createSignedUrl(path, 60 * 15);
  if (signErr || signed?.signedUrl == null) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  return NextResponse.json({ url: signed.signedUrl }, { status: 200 });
}
