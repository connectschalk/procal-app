import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { TALENT_PROFILE_PHOTOS_BUCKET } from "@/lib/storage-buckets";
import { NextResponse } from "next/server";

type Body = { email?: unknown };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Signed URL for the authenticated talent’s private profile photo (edit preview only). */
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

  const email = json.email.trim();
  const { data: rows, error: findError } = await admin
    .from("resources")
    .select("id, claimed, profile_photo_path")
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
    profile_photo_path: string | null;
  };
  if (row.claimed !== true) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const path = row.profile_photo_path?.trim();
  if (path == null || path === "") {
    return NextResponse.json({ url: null }, { status: 200 });
  }
  if (!path.startsWith(`${row.id}/`)) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  const { data: signed, error: signErr } = await admin.storage.from(TALENT_PROFILE_PHOTOS_BUCKET).createSignedUrl(path, 60 * 30);
  if (signErr || signed?.signedUrl == null) {
    return NextResponse.json({ url: null }, { status: 200 });
  }

  return NextResponse.json({ url: signed.signedUrl }, { status: 200 });
}
