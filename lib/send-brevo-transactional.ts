const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export type BrevoPreparedAttachment = { name: string; content: string };

/**
 * Server-only transactional email via Brevo HTTP API.
 * Does not log the API key.
 */
export async function sendBrevoTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  attachments?: BrevoPreparedAttachment[];
}): Promise<{ ok: true } | { ok: false; error: string; details?: string; status?: number }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey?.trim()) {
    return { ok: false, error: "Email service is not configured" };
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
      to: [{ email: params.to.trim() }],
      subject: params.subject.trim(),
      textContent: params.text,
      ...(params.attachments != null && params.attachments.length > 0
        ? { attachment: params.attachments }
        : {}),
    }),
  });

  if (!brevoRes.ok) {
    const brevoBody = await brevoRes.text();
    console.error("[brevo] send error", brevoRes.status, brevoRes.statusText, brevoBody);
    return {
      ok: false,
      error: "Failed to send email",
      details: brevoBody,
      status: brevoRes.status,
    };
  }

  return { ok: true };
}
