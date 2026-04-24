/**
 * Calls the server-only `/api/send-email` route (Brevo). Safe for use from client components.
 */
export async function sendEmailClient(params: {
  to: string;
  subject: string;
  text: string;
  /** Plain-text file bodies; server base64-encodes for Brevo `attachment`. */
  attachments?: Array<{ filename: string; content: string }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
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

  let data: { success?: boolean; error?: string } = {};
  try {
    data = (await res.json()) as { success?: boolean; error?: string };
  } catch {
    /* ignore */
  }

  if (!res.ok || data.success !== true) {
    return {
      ok: false,
      error: typeof data.error === "string" && data.error.trim() !== "" ? data.error : `Request failed (${res.status})`,
    };
  }

  return { ok: true };
}
