import { NextResponse } from "next/server";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

type Body = {
  to?: unknown;
  subject?: unknown;
  text?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Server-only transactional email via Brevo HTTP API (not SMTP).
 * Never returns or logs the API key.
 */
export async function POST(request: Request) {
  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { to, subject, text } = json;
  if (!isNonEmptyString(to) || !isNonEmptyString(subject) || !isNonEmptyString(text)) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid fields: to, subject, and text are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      { success: false, error: "Email service is not configured" },
      { status: 503 },
    );
  }

  const brevoRes = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: "Procal", email: "info@procal.co.za" },
      to: [{ email: to.trim() }],
      subject: subject.trim(),
      textContent: text,
    }),
  });

  if (!brevoRes.ok) {
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
