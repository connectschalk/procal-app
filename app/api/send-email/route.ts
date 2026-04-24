import { sendBrevoTransactionalEmail } from "@/lib/send-brevo-transactional";
import { NextResponse } from "next/server";

type Body = {
  to?: unknown;
  subject?: unknown;
  text?: unknown;
  attachments?: unknown;
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

  const { to, subject, text, attachments } = json;
  if (!isNonEmptyString(to) || !isNonEmptyString(subject) || !isNonEmptyString(text)) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid fields: to, subject, and text are required" },
      { status: 400 },
    );
  }

  let brevoAttachment: { name: string; content: string }[] | undefined;
  if (attachments !== undefined && attachments !== null) {
    if (!Array.isArray(attachments)) {
      return NextResponse.json(
        { success: false, error: "attachments must be an array when provided" },
        { status: 400 },
      );
    }
    const mapped: { name: string; content: string }[] = [];
    for (const item of attachments) {
      if (item === null || typeof item !== "object") {
        return NextResponse.json(
          { success: false, error: "Each attachment must be an object with filename and content" },
          { status: 400 },
        );
      }
      const row = item as { filename?: unknown; content?: unknown };
      if (!isNonEmptyString(row.filename) || typeof row.content !== "string") {
        return NextResponse.json(
          { success: false, error: "Each attachment needs a non-empty filename and string content" },
          { status: 400 },
        );
      }
      mapped.push({
        name: row.filename.trim(),
        content: Buffer.from(row.content, "utf8").toString("base64"),
      });
    }
    if (mapped.length > 0) {
      brevoAttachment = mapped;
    }
  }

  const send = await sendBrevoTransactionalEmail({
    to: to.trim(),
    subject: subject.trim(),
    text,
    ...(brevoAttachment != null && brevoAttachment.length > 0 ? { attachments: brevoAttachment } : {}),
  });

  if (!send.ok) {
    if (send.error === "Email service is not configured") {
      return NextResponse.json({ success: false, error: send.error }, { status: 503 });
    }
    return NextResponse.json(
      {
        success: false,
        error: send.error,
        ...(send.details != null ? { details: send.details } : {}),
        ...(send.status != null ? { status: send.status } : {}),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
