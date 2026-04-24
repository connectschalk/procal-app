/**
 * Calls the server-only `/api/send-email` route (Brevo). Safe for use from client components.
 */

export type SendEmailClientResult =
  | { ok: true }
  | { ok: false; error: string; details?: string; status?: number };

export async function sendEmailClient(params: {
  to: string;
  subject: string;
  text: string;
  /** Plain-text file bodies; server base64-encodes for Brevo `attachment`. */
  attachments?: Array<{ filename: string; content: string }>;
}): Promise<SendEmailClientResult> {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: params.to,
      subject: params.subject,
      text: params.text,
      ...(params.attachments != null && params.attachments.length > 0
        ? { attachments: params.attachments }
        : {}),
    }),
  });

  const raw = await res.text();
  let data: {
    success?: boolean;
    error?: string;
    details?: string;
    status?: number;
  } = {};
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    /* ignore */
  }

  if (!res.ok || data.success !== true) {
    const errMsg =
      typeof data.error === "string" && data.error.trim() !== "" ? data.error : `Request failed (${res.status})`;
    return {
      ok: false,
      error: errMsg,
      ...(typeof data.details === "string" ? { details: data.details } : {}),
      ...(typeof data.status === "number" ? { status: data.status } : {}),
    };
  }

  return { ok: true };
}
