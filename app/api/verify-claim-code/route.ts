import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { NextResponse } from "next/server";

type Body = {
  email?: unknown;
  code?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeCode(v: unknown): string | null {
  if (!isNonEmptyString(v)) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length !== 6) return null;
  return digits;
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

  const code = normalizeCode(json.code);
  if (code == null) {
    return NextResponse.json({ success: false, error: "Enter the 6-digit code from your email" }, { status: 400 });
  }

  const email = json.email.trim();
  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Server is not configured for profile claims" },
      { status: 503 },
    );
  }

  const { data: rows, error: findError } = await admin
    .from("resources")
    .select("id, claimed, claim_code")
    .ilike("contact_email", email);

  if (findError) {
    console.error("[verify-claim-code] select", findError);
    return NextResponse.json({ success: false, error: "Could not verify code" }, { status: 500 });
  }

  const list = rows ?? [];
  if (list.length !== 1) {
    return NextResponse.json({ success: false, error: "Invalid code or email" }, { status: 400 });
  }

  const row = list[0] as { id: string; claimed: boolean | null; claim_code: string | null };
  if (row.claimed === true) {
    return NextResponse.json({ success: false, error: "This profile is already claimed" }, { status: 400 });
  }
  if (row.claim_code == null || row.claim_code !== code) {
    return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("resources")
    .update({ claimed: true, claim_code: null })
    .eq("id", row.id);

  if (updateError) {
    console.error("[verify-claim-code] update", updateError);
    return NextResponse.json({ success: false, error: "Could not complete claim" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
