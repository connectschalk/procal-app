/**
 * Calls the server-only `/api/send-email` route (Brevo). Safe for use from client components.
 */
export async function sendEmailClient(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
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
