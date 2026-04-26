import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { NextResponse } from "next/server";

type Body = {
  title?: unknown;
  role_type?: unknown;
  job_spec?: unknown;
  rate_min?: unknown;
  rate_max?: unknown;
  start_date?: unknown;
  location?: unknown;
  status?: unknown;
};

function textOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function numberOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function getCurrentUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error != null || user == null) return { userId: null, error: "Not signed in" } as const;
  return { userId: user.id, error: null } as const;
}

export async function GET() {
  const current = await getCurrentUserId();
  if (current.userId == null) {
    return NextResponse.json({ success: false, error: current.error }, { status: 401 });
  }
  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json({ success: false, error: "Server is not configured" }, { status: 503 });
  }
  const { data, error } = await admin
    .from("company_resource_requirements")
    .select("id, title, role_type, job_spec, rate_min, rate_max, start_date, location, status, created_at")
    .eq("company_user_id", current.userId)
    .order("created_at", { ascending: false });
  if (error != null) {
    return NextResponse.json({ success: false, error: "Could not load requirements" }, { status: 500 });
  }
  return NextResponse.json({ success: true, requirements: data ?? [] });
}

export async function POST(request: Request) {
  const current = await getCurrentUserId();
  if (current.userId == null) {
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

  const title = textOrNull(json.title);
  if (title == null) {
    return NextResponse.json({ success: false, error: "Position / title is required" }, { status: 400 });
  }

  const rateMin = numberOrNull(json.rate_min);
  const rateMax = numberOrNull(json.rate_max);
  if (rateMin != null && rateMax != null && rateMin > rateMax) {
    return NextResponse.json({ success: false, error: "rate_min cannot exceed rate_max" }, { status: 400 });
  }

  const startDate = textOrNull(json.start_date);
  const patch = {
    company_user_id: current.userId,
    title,
    role_type: textOrNull(json.role_type),
    job_spec: textOrNull(json.job_spec),
    rate_min: rateMin,
    rate_max: rateMax,
    start_date: startDate,
    location: textOrNull(json.location),
    status: textOrNull(json.status) ?? "open",
  };

  const { error } = await admin.from("company_resource_requirements").insert(patch);
  if (error != null) {
    return NextResponse.json({ success: false, error: "Could not create requirement" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
