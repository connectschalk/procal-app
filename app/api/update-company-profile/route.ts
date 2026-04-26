import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { NextResponse } from "next/server";

type Body = {
  company_name?: unknown;
  logo_path?: unknown;
  contact_person?: unknown;
  contact_email?: unknown;
  contact_number?: unknown;
  website?: unknown;
  location?: unknown;
  description?: unknown;
  talent_interests?: unknown;
};

function textOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function parseInterests(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t !== "" && !out.includes(t)) out.push(t);
  }
  return out;
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error != null || user == null) return { error: "Not signed in", user: null } as const;
  return { error: null, user } as const;
}

export async function GET() {
  const current = await getCurrentUser();
  if (current.user == null) {
    return NextResponse.json({ success: false, error: current.error }, { status: 401 });
  }
  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Server is not configured" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("company_profiles")
    .select(
      "company_name, logo_path, contact_person, contact_email, contact_number, website, location, description, talent_interests",
    )
    .eq("user_id", current.user.id)
    .maybeSingle();

  if (error != null) {
    console.error("[update-company-profile] get", error);
    return NextResponse.json({ success: false, error: "Could not load company profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data ?? null });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (current.user == null) {
    return NextResponse.json({ success: false, error: current.error }, { status: 401 });
  }
  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Server is not configured" }, { status: 503 });
  }

  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = {
    user_id: current.user.id,
    company_name: textOrNull(json.company_name),
    logo_path: textOrNull(json.logo_path),
    contact_person: textOrNull(json.contact_person),
    contact_email: textOrNull(json.contact_email),
    contact_number: textOrNull(json.contact_number),
    website: textOrNull(json.website),
    location: textOrNull(json.location),
    description: textOrNull(json.description),
    talent_interests: parseInterests(json.talent_interests),
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("company_profiles").upsert(patch, { onConflict: "user_id" });
  if (error != null) {
    console.error("[update-company-profile] upsert", error);
    return NextResponse.json({ success: false, error: "Could not save company profile" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
