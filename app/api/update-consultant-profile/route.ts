import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { NextResponse } from "next/server";

type Body = {
  email?: unknown;
  name?: unknown;
  headline?: unknown;
  bio?: unknown;
  hourly_rate?: unknown;
  location?: unknown;
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

export async function POST(request: Request) {
  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
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

  const rateResult = parseHourlyRate(json.hourly_rate);
  if (!rateResult.ok) {
    return NextResponse.json(
      { success: false, error: "hourly_rate must be a valid non-negative number" },
      { status: 400 },
    );
  }
  const hourly_rate = rateResult.value;

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

  const { error: updateError } = await admin
    .from("resources")
    .update({
      name,
      headline,
      bio,
      hourly_rate,
      location,
    })
    .eq("id", row.id);

  if (updateError) {
    console.error("[update-consultant-profile] update", updateError);
    return NextResponse.json({ success: false, error: "Could not update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
