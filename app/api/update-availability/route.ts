import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { NextResponse } from "next/server";

type Body = {
  email?: unknown;
  action?: unknown;
  available_from?: unknown;
  blocked_date?: unknown;
  reason?: unknown;
  id?: unknown;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isIsoDateString(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(`${t}T12:00:00`);
  return !Number.isNaN(d.getTime());
}

async function resolveClaimedResourceId(
  admin: NonNullable<ReturnType<typeof createServiceRoleSupabase>>,
  email: string,
): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  const { data: rows, error } = await admin
    .from("resources")
    .select("id, claimed")
    .ilike("contact_email", email);

  if (error) {
    console.error("[update-availability] select resource", error);
    return { ok: false, status: 500, error: "Could not load profile" };
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return { ok: false, status: 404, error: "No profile found for this email" };
  }
  if (list.length > 1) {
    return { ok: false, status: 409, error: "Multiple profiles match this email" };
  }

  const row = list[0] as { id: string; claimed: boolean | null };
  if (row.claimed !== true) {
    return { ok: false, status: 403, error: "Profile must be claimed before updating availability" };
  }

  return { ok: true, id: row.id };
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

  const action = json.action;
  if (action !== "set_available_from" && action !== "add_blocked" && action !== "delete_blocked") {
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Server is not configured for availability updates" },
      { status: 503 },
    );
  }

  const email = json.email.trim();
  const resolved = await resolveClaimedResourceId(admin, email);
  if (!resolved.ok) {
    return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status });
  }

  const resourceId = resolved.id;

  if (action === "set_available_from") {
    const v = json.available_from;
    if (v === null || v === undefined || v === "") {
      const { error: upErr } = await admin.from("resources").update({ available_from: null }).eq("id", resourceId);
      if (upErr) {
        console.error("[update-availability] clear available_from", upErr);
        return NextResponse.json({ success: false, error: "Could not update availability" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }
    if (!isIsoDateString(v)) {
      return NextResponse.json({ success: false, error: "available_from must be YYYY-MM-DD" }, { status: 400 });
    }
    const { error: upErr } = await admin
      .from("resources")
      .update({ available_from: v.trim() })
      .eq("id", resourceId);
    if (upErr) {
      console.error("[update-availability] set available_from", upErr);
      return NextResponse.json({ success: false, error: "Could not update availability" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "add_blocked") {
    if (!isIsoDateString(json.blocked_date)) {
      return NextResponse.json({ success: false, error: "blocked_date must be YYYY-MM-DD" }, { status: 400 });
    }
    const reason =
      typeof json.reason === "string" && json.reason.trim() !== "" ? json.reason.trim() : null;
    const { error: insErr } = await admin.from("resource_blocked_dates").insert([
      {
        resource_id: resourceId,
        blocked_date: (json.blocked_date as string).trim(),
        reason,
      },
    ]);
    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json({ success: false, error: "That date is already blocked" }, { status: 409 });
      }
      console.error("[update-availability] insert blocked", insErr);
      return NextResponse.json({ success: false, error: "Could not add blocked date" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  /* delete_blocked */
  if (!isNonEmptyString(json.id)) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }
  const rowId = (json.id as string).trim();

  const { data: existing, error: findErr } = await admin
    .from("resource_blocked_dates")
    .select("id")
    .eq("id", rowId)
    .eq("resource_id", resourceId)
    .maybeSingle();

  if (findErr || !existing) {
    return NextResponse.json({ success: false, error: "Blocked date not found" }, { status: 404 });
  }

  const { error: delErr } = await admin.from("resource_blocked_dates").delete().eq("id", rowId).eq("resource_id", resourceId);
  if (delErr) {
    console.error("[update-availability] delete blocked", delErr);
    return NextResponse.json({ success: false, error: "Could not remove blocked date" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
