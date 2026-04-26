import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { TALENT_PROFILE_PHOTOS_BUCKET } from "@/lib/storage-buckets";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(request: Request) {
  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Server is not configured for uploads" },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Expected multipart form data" }, { status: 400 });
  }

  const emailRaw = form.get("email");
  const file = form.get("file");
  if (!isNonEmptyString(emailRaw)) {
    return NextResponse.json({ success: false, error: "email is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "file is required" }, { status: 400 });
  }

  const email = emailRaw.trim();
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "File is too large. Max size is 5MB." },
      { status: 400 },
    );
  }

  const ext = ALLOWED.get(file.type);
  if (ext == null) {
    return NextResponse.json(
      { success: false, error: "Invalid file type. Allowed types: jpg, jpeg, png, webp" },
      { status: 400 },
    );
  }

  const { data: rows, error: findError } = await admin
    .from("resources")
    .select("id, claimed")
    .ilike("contact_email", email);

  if (findError) {
    console.error("[upload-talent-profile-photo] select", findError);
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
      { success: false, error: "Profile must be claimed before uploading a photo" },
      { status: 403 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const token = randomBytes(8).toString("hex");
  const objectPath = `${row.id}/${Date.now()}-${token}.${ext}`;

  const { error: upErr } = await admin.storage.from(TALENT_PROFILE_PHOTOS_BUCKET).upload(objectPath, buf, {
    contentType: file.type,
    upsert: true,
  });

  if (upErr) {
    console.error("[upload-talent-profile-photo] storage", upErr);
    const msg = upErr.message?.toLowerCase() ?? "";
    if (msg.includes("bucket") || msg.includes("not found") || upErr.message?.includes("404")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Storage bucket talent-profile-photos is missing. Create it in Supabase Storage.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Upload failed. Check bucket permissions and try again." },
      { status: 500 },
    );
  }

  const { error: dbErr } = await admin.from("resources").update({ profile_photo_path: objectPath }).eq("id", row.id);

  if (dbErr) {
    console.error("[upload-talent-profile-photo] db", dbErr);
    await admin.storage.from(TALENT_PROFILE_PHOTOS_BUCKET).remove([objectPath]).catch(() => {});
    return NextResponse.json({ success: false, error: "Could not save photo path" }, { status: 500 });
  }

  const { data: signed, error: signErr } = await admin.storage
    .from(TALENT_PROFILE_PHOTOS_BUCKET)
    .createSignedUrl(objectPath, 60 * 60);

  if (signErr) {
    console.error("[upload-talent-profile-photo] signed url", signErr);
  }

  return NextResponse.json({
    success: true,
    path: objectPath,
    signedUrl: signed?.signedUrl ?? null,
  });
}
