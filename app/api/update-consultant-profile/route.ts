import { isValidTalentAvatarKey } from "@/lib/talent-avatar-library";
import { OTHER_TALENT_OPTION, isCoreTalentIndustry } from "@/lib/talent-taxonomy";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { NextResponse } from "next/server";

type Body = {
  email?: unknown;
  name?: unknown;
  headline?: unknown;
  bio?: unknown;
  hourly_rate?: unknown;
  location?: unknown;
  industry?: unknown;
  resource_type?: unknown;
  other_resource_type?: unknown;
  avatar_key?: unknown;
  /** Only null is accepted from clients to clear; non-null paths must be set via upload API. */
  profile_photo_path?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseHourlyRate(v: unknown): { ok: true; value: number | null } | { ok: false } {
  if (v === null || v === undefined || v === "") return { ok: true, value: null };
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v < 0) return { ok: false };
    return { ok: true, value: v };
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return { ok: true, value: null };
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return { ok: false };
    return { ok: true, value: n };
  }
  return { ok: false };
}

const FORBIDDEN_DOCUMENT_KEYS = [
  "cv_document_path",
  "id_front_document_path",
  "id_back_document_path",
] as const;

export async function POST(request: Request) {
  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = json as Record<string, unknown>;
  for (const k of FORBIDDEN_DOCUMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, k)) {
      return NextResponse.json(
        { success: false, error: `Cannot update ${k} via this endpoint; use the document upload API.` },
        { status: 400 },
      );
    }
  }

  if (!isNonEmptyString(json.email)) {
    return NextResponse.json({ success: false, error: "email is required" }, { status: 400 });
  }

  const name = typeof json.name === "string" ? json.name.trim() : "";
  if (name === "") {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const headline = typeof json.headline === "string" ? json.headline.trim() || null : null;
  const bio = typeof json.bio === "string" ? json.bio.trim() || null : null;
  const location = typeof json.location === "string" ? json.location.trim() || null : null;
  const industry = typeof json.industry === "string" ? json.industry.trim() || null : null;
  const resource_type = typeof json.resource_type === "string" ? json.resource_type.trim() || null : null;
  const other_resource_type = typeof json.other_resource_type === "string" ? json.other_resource_type.trim() || null : null;

  const rateResult = parseHourlyRate(json.hourly_rate);
  if (!rateResult.ok) {
    return NextResponse.json(
      { success: false, error: "hourly_rate must be a valid non-negative number" },
      { status: 400 },
    );
  }
  const hourly_rate = rateResult.value;
  if (industry == null || industry === "") {
    return NextResponse.json({ success: false, error: "industry is required" }, { status: 400 });
  }
  if (!(isCoreTalentIndustry(industry) || industry === OTHER_TALENT_OPTION)) {
    return NextResponse.json({ success: false, error: "Invalid industry" }, { status: 400 });
  }
  if (resource_type == null || resource_type === "") {
    return NextResponse.json({ success: false, error: "resource_type is required" }, { status: 400 });
  }
  if ((industry === OTHER_TALENT_OPTION || resource_type === OTHER_TALENT_OPTION) && (other_resource_type == null || other_resource_type === "")) {
    return NextResponse.json({ success: false, error: "other_resource_type is required when using Other" }, { status: 400 });
  }

  let avatarKeyUpdate: string | null | undefined;
  if ("avatar_key" in json) {
    if (json.avatar_key === null || json.avatar_key === "") {
      avatarKeyUpdate = null;
    } else if (isValidTalentAvatarKey(json.avatar_key)) {
      avatarKeyUpdate = json.avatar_key;
    } else {
      return NextResponse.json({ success: false, error: "Invalid avatar_key" }, { status: 400 });
    }
  }

  let clearProfilePhoto = false;
  if ("profile_photo_path" in json) {
    if (json.profile_photo_path === null || json.profile_photo_path === "") {
      clearProfilePhoto = true;
    } else if (typeof json.profile_photo_path === "string") {
      return NextResponse.json(
        {
          success: false,
          error:
            "profile_photo_path cannot be set via this endpoint; use the upload API, or send null to clear.",
        },
        { status: 400 },
      );
    } else {
      return NextResponse.json({ success: false, error: "Invalid profile_photo_path" }, { status: 400 });
    }
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Server is not configured for profile updates" },
      { status: 503 },
    );
  }

  const email = json.email.trim();
  const { data: rows, error: findError } = await admin
    .from("resources")
    .select("id, claimed")
    .ilike("contact_email", email);

  if (findError) {
    console.error("[update-consultant-profile] select", findError);
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
      { success: false, error: "Profile must be claimed before editing" },
      { status: 403 },
    );
  }

  const patch: Record<string, unknown> = {
    name,
    headline,
    bio,
    hourly_rate,
    location,
    industry,
    resource_type,
    other_resource_type: other_resource_type === "" ? null : other_resource_type,
  };
  if (avatarKeyUpdate !== undefined) {
    patch.avatar_key = avatarKeyUpdate;
  }
  if (clearProfilePhoto) {
    patch.profile_photo_path = null;
  }

  const { error: updateError } = await admin.from("resources").update(patch).eq("id", row.id);

  if (updateError) {
    console.error("[update-consultant-profile] update", updateError);
    return NextResponse.json({ success: false, error: "Could not update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
