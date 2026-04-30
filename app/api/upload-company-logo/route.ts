import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { COMPANY_LOGOS_BUCKET } from "@/lib/storage-buckets";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError != null || user == null) {
    return NextResponse.json({ success: false, error: "No authenticated user" }, { status: 401 });
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Server is not configured" }, { status: 503 });
  }
  const { data: roleRow, error: roleError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (roleError != null || (roleRow as { role?: string } | null)?.role !== "company") {
    return NextResponse.json({ success: false, error: "Wrong role for this action" }, { status: 403 });
  }

  const { data: profileRow, error: profileLookupError } = await admin
    .from("company_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileLookupError != null) {
    console.error("[upload-company-logo] profile lookup", profileLookupError);
    return NextResponse.json({ success: false, error: "Could not verify company profile" }, { status: 500 });
  }
  if (profileRow == null) {
    return NextResponse.json(
      {
        success: false,
        error: "Save your company profile first, then upload a logo.",
      },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "file is required" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: "File must be under 5MB" }, { status: 400 });
  }
  const ext = ALLOWED.get(file.type);
  if (ext == null) {
    return NextResponse.json(
      { success: false, error: "Invalid file type. Allowed types: jpg, jpeg, png, webp, svg" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const token = randomBytes(8).toString("hex");
  const objectPath = `${user.id}/${Date.now()}-${token}.${ext}`;
  const { error: upErr } = await admin.storage.from(COMPANY_LOGOS_BUCKET).upload(objectPath, buf, {
    contentType: file.type,
    upsert: true,
  });
  if (upErr) {
    const msg = upErr.message?.toLowerCase() ?? "";
    if (msg.includes("bucket") || msg.includes("not found") || upErr.message?.includes("404")) {
      return NextResponse.json(
        {
          success: false,
          error: "Storage bucket company-logos is missing. Create it in Supabase Storage.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: false, error: "Could not upload logo" }, { status: 500 });
  }

  const { error: dbErr } = await admin
    .from("company_profiles")
    .upsert({ user_id: user.id, logo_path: objectPath, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (dbErr) {
    await admin.storage.from(COMPANY_LOGOS_BUCKET).remove([objectPath]).catch(() => {});
    return NextResponse.json({ success: false, error: "Could not save logo path" }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(COMPANY_LOGOS_BUCKET).getPublicUrl(objectPath);
  const { data: signed } = await admin.storage.from(COMPANY_LOGOS_BUCKET).createSignedUrl(objectPath, 60 * 60);
  return NextResponse.json({
    success: true,
    path: objectPath,
    publicUrl: pub.publicUrl ?? null,
    signedUrl: signed?.signedUrl ?? null,
  });
}
