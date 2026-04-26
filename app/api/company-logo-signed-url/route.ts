import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { COMPANY_LOGOS_BUCKET } from "@/lib/storage-buckets";
import { NextResponse } from "next/server";

type Body = { path?: unknown };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError != null || user == null) {
    return NextResponse.json({ url: null, error: "No authenticated user" }, { status: 401 });
  }
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
  if (!isNonEmptyString(json.path)) {
    return NextResponse.json({ url: null, error: "path is required" }, { status: 400 });
  }
  const path = json.path.trim();
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ url: null, error: "Wrong role for this action" }, { status: 403 });
  }
  const { data: signed, error } = await admin.storage.from(COMPANY_LOGOS_BUCKET).createSignedUrl(path, 60 * 60);
  if (error != null || signed?.signedUrl == null) {
    const msg = error?.message?.toLowerCase() ?? "";
    if (msg.includes("bucket") || msg.includes("not found") || error?.message?.includes("404")) {
      return NextResponse.json(
        { url: null, error: "Storage bucket company-logos is missing. Create it in Supabase Storage." },
        { status: 503 },
      );
    }
    return NextResponse.json({ url: null, error: "Could not create signed URL" }, { status: 500 });
  }
  return NextResponse.json({ url: signed.signedUrl }, { status: 200 });
}
