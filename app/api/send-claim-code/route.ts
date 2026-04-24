import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { sendBrevoTransactionalEmail } from "@/lib/send-brevo-transactional";
import { randomInt } from "crypto";
import { NextResponse } from "next/server";

type Body = {
  email?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function generateSixDigitCode(): string {
  return String(randomInt(100000, 1000000));
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
    .select("id, claimed")
    .ilike("contact_email", email);

  if (findError) {
    console.error("[send-claim-code] select", findError);
    return NextResponse.json({ success: false, error: "Could not look up profile" }, { status: 500 });
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return NextResponse.json(
      { success: false, error: "No profile found with this contact email" },
      { status: 404 },
    );
  }
  if (list.length > 1) {
    return NextResponse.json(
      {
        success: false,
        error: "Multiple profiles use this contact email. Contact support to claim your profile.",
      },
      { status: 409 },
    );
  }

  const row = list[0] as { id: string; claimed: boolean | null };
  if (row.claimed === true) {
    return NextResponse.json({ success: false, error: "This profile is already claimed" }, { status: 400 });
  }

  const code = generateSixDigitCode();
  const { error: updateError } = await admin.from("resources").update({ claim_code: code }).eq("id", row.id);

  if (updateError) {
    console.error("[send-claim-code] update", updateError);
    return NextResponse.json({ success: false, error: "Could not save verification code" }, { status: 500 });
  }

  const send = await sendBrevoTransactionalEmail({
    to: email,
    subject: "Claim your Procal profile",
    text: [
      "Use this code to claim your Procal consultant profile:",
      "",
      code,
      "",
      "If you did not request this, you can ignore this email.",
      "",
      "— Procal",
    ].join("\n"),
  });

  if (!send.ok) {
    await admin.from("resources").update({ claim_code: null }).eq("id", row.id);
    return NextResponse.json(
      { success: false, error: send.error, ...(send.details != null ? { details: send.details } : {}) },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
