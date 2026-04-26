import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TALENT_DOCUMENTS_BUCKET } from "@/lib/storage-buckets";
import { NextResponse } from "next/server";

type Body = { resourceId?: unknown };

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
    return NextResponse.json({ success: false, error: "No authenticated user" }, { status: 401 });
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
  if (!isNonEmptyString(json.resourceId)) {
    return NextResponse.json({ success: false, error: "resourceId is required" }, { status: 400 });
  }
  const resourceId = json.resourceId.trim();

  const { data: roleRow, error: roleError } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (roleError != null || (roleRow as { role?: string } | null)?.role !== "company") {
    return NextResponse.json({ success: false, error: "Wrong role for this action" }, { status: 403 });
  }

  const { data: companyProfile } = await admin
    .from("company_profiles")
    .select("contact_email, company_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const identityEmails = [
    user.email?.trim() ?? "",
    (companyProfile as { contact_email?: string | null } | null)?.contact_email?.trim() ?? "",
  ].filter((v) => v !== "");
  const identityCompanies = [
    (companyProfile as { company_name?: string | null } | null)?.company_name?.trim() ?? "",
  ].filter((v) => v !== "");

  const { data: interviews } = await admin
    .from("interview_requests")
    .select("requester_email, company_name")
    .eq("resource_id", resourceId)
    .eq("status", "accepted");
  const { data: engagements } = await admin
    .from("engagement_proposals")
    .select("requester_email, company_name")
    .eq("resource_id", resourceId)
    .eq("status", "accepted");

  const hasAccess = [...(interviews ?? []), ...(engagements ?? [])].some((row) => {
    const email = String((row as { requester_email?: string | null }).requester_email ?? "").trim().toLowerCase();
    const company = String((row as { company_name?: string | null }).company_name ?? "").trim().toLowerCase();
    return (
      identityEmails.some((e) => e.toLowerCase() === email) ||
      identityCompanies.some((c) => c.toLowerCase() === company)
    );
  });
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: "You do not have access to this CV yet." }, { status: 403 });
  }

  const { data: resourceRow, error: resourceError } = await admin
    .from("resources")
    .select("id, cv_document_path")
    .eq("id", resourceId)
    .maybeSingle();
  if (resourceError != null || resourceRow == null) {
    return NextResponse.json({ success: false, error: "No profile found" }, { status: 404 });
  }
  const cvPath = (resourceRow as { cv_document_path?: string | null }).cv_document_path?.trim() ?? "";
  if (cvPath === "") {
    return NextResponse.json({ success: false, error: "No CV uploaded yet." }, { status: 404 });
  }
  const { data: signed, error: signedError } = await admin.storage
    .from(TALENT_DOCUMENTS_BUCKET)
    .createSignedUrl(cvPath, 60 * 10);
  if (signedError != null || signed?.signedUrl == null) {
    return NextResponse.json({ success: false, error: "Could not create signed CV URL" }, { status: 500 });
  }
  return NextResponse.json({ success: true, url: signed.signedUrl }, { status: 200 });
}
