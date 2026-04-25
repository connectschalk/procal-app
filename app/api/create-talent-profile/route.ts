import { isValidTalentAvatarKey } from "@/lib/talent-avatar-library";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { NextResponse } from "next/server";

type Body = {
  name?: unknown;
  headline?: unknown;
  bio?: unknown;
  hourly_rate?: unknown;
  location?: unknown;
  avatar_key?: unknown;
};

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

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr != null || user == null) {
    return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
  }

  const sessionEmail = user.email?.trim();
  if (!sessionEmail) {
    return NextResponse.json({ success: false, error: "Your account has no email address" }, { status: 400 });
  }

  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof json.name === "string" ? json.name.trim() : "";
  if (name === "") {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }

  const headline = typeof json.headline === "string" ? json.headline.trim() : "";
  if (headline === "") {
    return NextResponse.json({ success: false, error: "headline is required" }, { status: 400 });
  }

  const bio = typeof json.bio === "string" ? json.bio.trim() : "";
  if (bio === "") {
    return NextResponse.json({ success: false, error: "bio is required" }, { status: 400 });
  }

  const location = typeof json.location === "string" ? json.location.trim() || null : null;
  if (location == null) {
    return NextResponse.json({ success: false, error: "location is required" }, { status: 400 });
  }

  const rateResult = parseHourlyRate(json.hourly_rate);
  if (!rateResult.ok) {
    return NextResponse.json(
      { success: false, error: "hourly_rate must be a valid non-negative number" },
      { status: 400 },
    );
  }
  const hourly_rate = rateResult.value;
  if (hourly_rate == null) {
    return NextResponse.json({ success: false, error: "hourly_rate is required" }, { status: 400 });
  }

  let avatar_key: string | null = null;
  if ("avatar_key" in json) {
    if (json.avatar_key === null || json.avatar_key === "") {
      avatar_key = null;
    } else if (isValidTalentAvatarKey(json.avatar_key)) {
      avatar_key = json.avatar_key;
    } else {
      return NextResponse.json({ success: false, error: "Invalid avatar_key" }, { status: 400 });
    }
  }

  if (avatar_key == null) {
    return NextResponse.json({ success: false, error: "avatar_key is required" }, { status: 400 });
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Server is not configured for profile creation" },
      { status: 503 },
    );
  }

  const { data: existing, error: findError } = await admin
    .from("resources")
    .select("id")
    .ilike("contact_email", sessionEmail);

  if (findError) {
    console.error("[create-talent-profile] select", findError);
    return NextResponse.json({ success: false, error: "Could not verify profile" }, { status: 500 });
  }

  const existingList = existing ?? [];
  if (existingList.length > 0) {
    return NextResponse.json(
      { success: false, error: "A talent profile already exists for this account" },
      { status: 409 },
    );
  }

  const insertRow = {
    contact_email: sessionEmail,
    name,
    headline,
    bio,
    hourly_rate,
    location,
    avatar_key,
    claimed: true,
    profile_status: "approved",
  };

  const { data: inserted, error: insertError } = await admin
    .from("resources")
    .insert(insertRow)
    .select("id")
    .single();

  if (insertError) {
    console.error("[create-talent-profile] insert", insertError);
    return NextResponse.json({ success: false, error: "Could not create profile" }, { status: 500 });
  }

  const row = inserted as { id: string } | null;
  if (row?.id == null) {
    return NextResponse.json({ success: false, error: "Create did not return an id" }, { status: 500 });
  }

  return NextResponse.json({ success: true, resourceId: row.id });
}
