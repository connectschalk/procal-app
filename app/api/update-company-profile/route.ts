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
  talent_industry?: unknown;
  talent_resource_type?: unknown;
};

type CompanyWritePayload = {
  user_id: string;
  company_name: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_number: string | null;
  website: string | null;
  location: string | null;
  description: string | null;
  updated_at: string;
  logo_path?: string | null;
  talent_interests?: string[];
  talent_industry?: string | null;
  talent_resource_type?: string | null;
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

function safeDbErrorMessage(error: unknown, fallback: string): string {
  const message =
    error != null && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const lower = message.toLowerCase();
  if (lower.includes("relation") && lower.includes("company_profiles")) {
    return "Company profiles table is missing. Run migration supabase/sql/018_company_profiles.sql.";
  }
  if (lower.includes("permission denied") || lower.includes("row-level security")) {
    return "Permission denied saving company profile. Check company_profiles RLS policies for your user.";
  }
  if (message.trim() !== "") return message;
  return fallback;
}

async function getCompanyProfilesColumns(
  admin: NonNullable<ReturnType<typeof createServiceRoleSupabase>>,
) {
  const { data, error } = await admin
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "company_profiles");
  if (error != null) {
    console.error("[update-company-profile] column lookup", error);
    return new Set<string>();
  }
  return new Set((data ?? []).flatMap((row) => (typeof row.column_name === "string" ? [row.column_name] : [])));
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

  const columns = await getCompanyProfilesColumns(admin);
  const hasTalentInterests = columns.has("talent_interests");
  const hasTalentIndustry = columns.has("talent_industry");
  const hasTalentResourceType = columns.has("talent_resource_type");
  const selectParts = [
    "company_name",
    "logo_path",
    "contact_person",
    "contact_email",
    "contact_number",
    "website",
    "location",
    "description",
    ...(hasTalentInterests ? ["talent_interests"] : []),
    ...(hasTalentIndustry ? ["talent_industry"] : []),
    ...(hasTalentResourceType ? ["talent_resource_type"] : []),
  ];
  const selectFields = selectParts.join(", ");
  const { data, error } = await admin
    .from("company_profiles")
    .select(selectFields)
    .eq("user_id", current.user.id)
    .maybeSingle();

  if (error != null) {
    console.error("[update-company-profile] get", error);
    return NextResponse.json(
      { success: false, error: safeDbErrorMessage(error, "Could not load company profile") },
      { status: 500 },
    );
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

  const columns = await getCompanyProfilesColumns(admin);
  const hasTalentInterests = columns.has("talent_interests");
  const hasTalentIndustry = columns.has("talent_industry");
  const hasTalentResourceType = columns.has("talent_resource_type");

  const { data: existing, error: existingError } = await admin
    .from("company_profiles")
    .select("logo_path")
    .eq("user_id", current.user.id)
    .maybeSingle();

  if (existingError != null) {
    console.error("[update-company-profile] pre-upsert fetch", existingError);
    return NextResponse.json(
      { success: false, error: safeDbErrorMessage(existingError, "Could not save company profile") },
      { status: 500 },
    );
  }

  const company_name = textOrNull(json.company_name);
  const contact_person = textOrNull(json.contact_person);
  const contact_email = textOrNull(json.contact_email);

  if (existing == null) {
    if (company_name == null || contact_person == null || contact_email == null) {
      return NextResponse.json(
        {
          success: false,
          error: "Company name, contact person, and contact email are required to create your profile.",
        },
        { status: 400 },
      );
    }
  } else {
    if (company_name == null || contact_person == null || contact_email == null) {
      return NextResponse.json(
        {
          success: false,
          error: "Company name, contact person, and contact email are required.",
        },
        { status: 400 },
      );
    }
  }

  const patch: CompanyWritePayload = {
    user_id: current.user.id,
    company_name,
    contact_person,
    contact_email,
    contact_number: textOrNull(json.contact_number),
    website: textOrNull(json.website),
    location: textOrNull(json.location),
    description: textOrNull(json.description),
    updated_at: new Date().toISOString(),
  };
  const parsedInterests = parseInterests(json.talent_interests);
  const parsedIndustry = textOrNull(json.talent_industry);
  const parsedResourceType = textOrNull(json.talent_resource_type);
  const fallbackIndustry = parsedInterests[0] ?? null;
  const fallbackResourceType = parsedInterests[1] ?? null;
  if (hasTalentInterests) {
    const interestsToStore =
      parsedIndustry != null || parsedResourceType != null
        ? [parsedIndustry ?? fallbackIndustry ?? "", parsedResourceType ?? fallbackResourceType ?? "All"].filter(
            (v) => v.trim() !== "",
          )
        : parsedInterests;
    patch.talent_interests = interestsToStore;
  }
  if (hasTalentIndustry) {
    patch.talent_industry = parsedIndustry ?? fallbackIndustry;
  }
  if (hasTalentResourceType) {
    patch.talent_resource_type = parsedResourceType ?? fallbackResourceType ?? "All";
  }
  const incomingLogo = textOrNull(json.logo_path);
  if (incomingLogo != null) {
    patch.logo_path = incomingLogo;
  }

  if (existing == null) {
    const { error: insertError } = await admin.from("company_profiles").insert(patch);
    if (insertError != null) {
      console.error("[update-company-profile] insert", insertError);
      return NextResponse.json(
        { success: false, error: safeDbErrorMessage(insertError, "Could not save company profile") },
        { status: 500 },
      );
    }
  } else {
    const updatePatch: Omit<CompanyWritePayload, "user_id"> = {
      company_name: patch.company_name,
      contact_person: patch.contact_person,
      contact_email: patch.contact_email,
      contact_number: patch.contact_number,
      website: patch.website,
      location: patch.location,
      description: patch.description,
      updated_at: patch.updated_at,
      ...(patch.logo_path !== undefined ? { logo_path: patch.logo_path } : {}),
      ...(patch.talent_interests !== undefined ? { talent_interests: patch.talent_interests } : {}),
      ...(patch.talent_industry !== undefined ? { talent_industry: patch.talent_industry } : {}),
      ...(patch.talent_resource_type !== undefined ? { talent_resource_type: patch.talent_resource_type } : {}),
    };
    const { error: updateError } = await admin
      .from("company_profiles")
      .update(updatePatch)
      .eq("user_id", current.user.id);
    if (updateError != null) {
      console.error("[update-company-profile] update", updateError);
      return NextResponse.json(
        { success: false, error: safeDbErrorMessage(updateError, "Could not save company profile") },
        { status: 500 },
      );
    }
  }

  const savedSelectParts = [
    "company_name",
    "logo_path",
    "contact_person",
    "contact_email",
    "contact_number",
    "website",
    "location",
    "description",
    ...(hasTalentInterests ? ["talent_interests"] : []),
    ...(hasTalentIndustry ? ["talent_industry"] : []),
    ...(hasTalentResourceType ? ["talent_resource_type"] : []),
  ];
  const savedSelect = savedSelectParts.join(", ");
  const { data: saved, error: savedError } = await admin
    .from("company_profiles")
    .select(savedSelect)
    .eq("user_id", current.user.id)
    .maybeSingle();

  if (savedError != null || saved == null) {
    console.error("[update-company-profile] post-upsert fetch", savedError);
    return NextResponse.json({
      success: true,
      profile: {
        company_name: patch.company_name,
        logo_path: patch.logo_path ?? null,
        contact_person: patch.contact_person,
        contact_email: patch.contact_email,
        contact_number: patch.contact_number,
        website: patch.website,
        location: patch.location,
        description: patch.description,
        talent_interests: patch.talent_interests ?? [],
        talent_industry: patch.talent_industry ?? null,
        talent_resource_type: patch.talent_resource_type ?? null,
      },
    });
  }

  return NextResponse.json({ success: true, profile: saved });
}
