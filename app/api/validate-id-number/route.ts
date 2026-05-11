import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isValidSaIdNumberFormat, normalizeSaIdNumberInput } from "@/lib/sa-id-number";
import { NextResponse } from "next/server";

const CHECKID_BASE = "https://api.checkid.co.za";

type Body = { idNumber?: unknown };

type SafeResult = {
  dob?: string;
  age?: number;
  gender?: string;
  citizenship?: string;
};

type CheckIdPayload = {
  idNumber?: unknown;
  isValid?: unknown;
  dob?: unknown;
  age?: unknown;
  gender?: unknown;
  citizenship?: unknown;
};

function parseIsoDobToDateOnly(iso: unknown): string | null {
  if (typeof iso !== "string" || iso.length < 10) return null;
  const slice = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slice)) return null;
  return slice;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr != null || user == null) {
    return NextResponse.json(
      { ok: false, status: "failed" as const, message: "Sign in to validate your ID number." },
      { status: 401 },
    );
  }

  const sessionEmail = user.email?.trim();
  if (!sessionEmail) {
    return NextResponse.json(
      { ok: false, status: "failed" as const, message: "Your account has no email address." },
      { status: 400 },
    );
  }

  let json: Body;
  try {
    json = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, status: "failed" as const, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const raw = typeof json.idNumber === "string" ? json.idNumber : "";
  const idNumber = normalizeSaIdNumberInput(raw);

  if (idNumber.length !== 13) {
    return NextResponse.json({
      ok: false,
      status: "failed" as const,
      message: "A South African ID number must be 13 digits.",
    });
  }

  if (!isValidSaIdNumberFormat(idNumber)) {
    const admin = createServiceRoleSupabase();
    if (admin) {
      const { data: rows } = await admin
        .from("resources")
        .select("id")
        .ilike("contact_email", sessionEmail)
        .eq("claimed", true);
      const list = rows ?? [];
      if (list.length === 1) {
        const rid = (list[0] as { id: string }).id;
        await admin
          .from("resources")
          .update({
            id_number: idNumber,
            id_validation_status: "failed",
            id_validated_at: null,
            id_validation_response: null,
            id_dob: null,
            id_age: null,
            id_gender: null,
            id_citizenship: null,
            id_validation_error: "Invalid South African ID number format (checksum).",
          })
          .eq("id", rid);
      }
    }

    return NextResponse.json({
      ok: false,
      status: "failed" as const,
      message: "We could not verify this ID number. Please check the number.",
    });
  }

  const apiKey = process.env.CHECKID_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed" as const,
        message: "ID validation is not configured on the server. Please try again later.",
      },
      { status: 503 },
    );
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed" as const,
        message: "Server is not configured to save validation results.",
      },
      { status: 503 },
    );
  }

  const { data: rows, error: findError } = await admin
    .from("resources")
    .select("id")
    .ilike("contact_email", sessionEmail)
    .eq("claimed", true);

  if (findError) {
    console.error("[validate-id-number] select", findError);
    return NextResponse.json(
      { ok: false, status: "failed" as const, message: "Could not load your talent profile." },
      { status: 500 },
    );
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed" as const,
        message: "Create and save your talent profile before validating your ID number.",
      },
      { status: 404 },
    );
  }
  if (list.length > 1) {
    return NextResponse.json(
      {
        ok: false,
        status: "failed" as const,
        message: "Multiple profiles match this account. Contact support.",
      },
      { status: 409 },
    );
  }

  const resourceId = (list[0] as { id: string }).id;

  const { error: pendingErr } = await admin
    .from("resources")
    .update({
      id_number: idNumber,
      id_validation_status: "pending",
      id_validation_error: null,
    })
    .eq("id", resourceId);

  if (pendingErr) {
    console.error("[validate-id-number] pending update", pendingErr);
    return NextResponse.json(
      { ok: false, status: "failed" as const, message: "Could not update your profile." },
      { status: 500 },
    );
  }

  const url = `${CHECKID_BASE}/api/v1/validate/${encodeURIComponent(idNumber)}`;
  let checkRes: Response;
  try {
    checkRes = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[validate-id-number] fetch", e);
    await admin
      .from("resources")
      .update({
        id_validation_status: "failed",
        id_validation_error: "Could not reach the ID validation service.",
        id_validation_response: { error: "network" },
      })
      .eq("id", resourceId);

    return NextResponse.json({
      ok: false,
      status: "failed" as const,
      message: "We could not verify this ID number. Please check the number.",
    });
  }

  const responseText = await checkRes.text();
  const parsedUnknown = safeJsonParse(responseText);

  if (checkRes.status === 401) {
    await admin
      .from("resources")
      .update({
        id_validation_status: "failed",
        id_validated_at: null,
        id_validation_error: "Check ID API rejected the server credentials (401).",
        id_validation_response: parsedUnknown ?? { raw: responseText.slice(0, 2000) },
      })
      .eq("id", resourceId);

    return NextResponse.json({
      ok: false,
      status: "failed" as const,
      message: "ID validation service authentication failed. Please contact support.",
    });
  }

  if (checkRes.status === 400) {
    const msg =
      typeof parsedUnknown === "object" && parsedUnknown != null && "message" in parsedUnknown
        ? String((parsedUnknown as { message?: unknown }).message ?? "")
        : "";
    const detail = msg.trim() !== "" ? msg : "The Check ID service rejected this request (400).";
    await admin
      .from("resources")
      .update({
        id_number: idNumber,
        id_validation_status: "failed",
        id_validated_at: null,
        id_dob: null,
        id_age: null,
        id_gender: null,
        id_citizenship: null,
        id_validation_error: detail,
        id_validation_response: parsedUnknown ?? { raw: responseText.slice(0, 2000) },
      })
      .eq("id", resourceId);

    return NextResponse.json({
      ok: false,
      status: "failed" as const,
      message: "We could not verify this ID number. Please check the number.",
    });
  }

  if (!checkRes.ok) {
    await admin
      .from("resources")
      .update({
        id_validation_status: "failed",
        id_validated_at: null,
        id_validation_error: `Check ID API error (${checkRes.status}).`,
        id_validation_response: parsedUnknown ?? { raw: responseText.slice(0, 2000) },
      })
      .eq("id", resourceId);

    return NextResponse.json({
      ok: false,
      status: "failed" as const,
      message: "We could not verify this ID number. Please check the number.",
    });
  }

  const payload = (typeof parsedUnknown === "object" && parsedUnknown != null
    ? parsedUnknown
    : {}) as CheckIdPayload;

  const isValid = payload.isValid === true;
  const responseJson = payload as Record<string, unknown>;

  if (isValid) {
    const dobIso = typeof payload.dob === "string" ? payload.dob : undefined;
    const dobDate = parseIsoDobToDateOnly(payload.dob);
    const age = typeof payload.age === "number" && Number.isFinite(payload.age) ? Math.trunc(payload.age) : null;
    const gender = typeof payload.gender === "string" ? payload.gender : null;
    const citizenship = typeof payload.citizenship === "string" ? payload.citizenship : null;

    const { error: upErr } = await admin
      .from("resources")
      .update({
        id_number: idNumber,
        id_validation_status: "verified",
        id_validated_at: new Date().toISOString(),
        id_validation_response: responseJson,
        id_dob: dobDate,
        id_age: age,
        id_gender: gender,
        id_citizenship: citizenship,
        id_validation_error: null,
      })
      .eq("id", resourceId);

    if (upErr) {
      console.error("[validate-id-number] verified update", upErr);
      return NextResponse.json(
        { ok: false, status: "failed" as const, message: "Could not save validation results." },
        { status: 500 },
      );
    }

    const result: SafeResult = {};
    if (dobIso != null && dobIso.trim() !== "") result.dob = dobIso;
    if (age != null) result.age = age;
    if (gender != null && gender.trim() !== "") result.gender = gender;
    if (citizenship != null && citizenship.trim() !== "") result.citizenship = citizenship;

    return NextResponse.json({
      ok: true,
      status: "verified" as const,
      message: "ID number verified",
      result,
    });
  }

  const failMessage = "This ID number did not pass validation.";

  const { error: failErr } = await admin
    .from("resources")
    .update({
      id_number: idNumber,
      id_validation_status: "failed",
      id_validated_at: null,
      id_dob: null,
      id_age: null,
      id_gender: null,
      id_citizenship: null,
      id_validation_error: failMessage,
      id_validation_response: responseJson,
    })
    .eq("id", resourceId);

  if (failErr) {
    console.error("[validate-id-number] failed update", failErr);
    return NextResponse.json(
      { ok: false, status: "failed" as const, message: "Could not save validation results." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: false,
    status: "failed" as const,
    message: "We could not verify this ID number. Please check the number.",
  });
}
