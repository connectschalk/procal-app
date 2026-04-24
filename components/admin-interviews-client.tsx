"use client";

import { createInterviewIcs } from "@/lib/calendar-invite";
import { interviewAcceptedEmail, interviewDeclinedEmail } from "@/lib/email-placeholders";
import { sendEmailClient } from "@/lib/send-email-client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminInterviewRequestRow = {
  id: string;
  resource_id: string;
  consultant_name: string | null;
  company_name: string;
  requester_name: string;
  requester_email: string;
  message: string | null;
  proposed_slot_1: string | null;
  proposed_slot_2: string | null;
  proposed_slot_3: string | null;
  selected_slot: string | null;
  status: string;
  created_at: string;
};

function formatSlot(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function statusBadgeClasses(status: string) {
  const s = status.toLowerCase();
  if (s === "accepted") {
    return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80";
  }
  if (s === "declined") {
    return "bg-red-100 text-red-900 ring-1 ring-red-200/80";
  }
  return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80";
}

function slotProvided(value: string | null) {
  return value != null && String(value).trim() !== "";
}

export function AdminInterviewsClient({ initialRows }: { initialRows: AdminInterviewRequestRow[] }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function acceptWithSlot(
    id: string,
    companyName: string,
    requesterEmail: string,
    selectedSlot: string,
    acceptOption: 1 | 2 | 3,
  ) {
    setActionError(null);
    const key = `${id}:accept-${acceptOption}`;
    setBusyKey(key);
    const { error } = await supabase
      .from("interview_requests")
      .update({ status: "accepted", selected_slot: selectedSlot })
      .eq("id", id);
    setBusyKey(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    // Best-effort MVP: email the requester; status update already succeeded.
    const acceptedPreview = interviewAcceptedEmail({
      companyName,
      selectedSlot,
    });

    let ics: { filename: string; content: string } | null = null;
    try {
      ics = createInterviewIcs({
        title: `Procal interview — ${companyName}`,
        description: `Interview request accepted for ${companyName}.`,
        start: selectedSlot,
        durationMinutes: 30,
        organizerEmail: "info@procal.co.za",
        attendeeEmail: requesterEmail.trim(),
      });
    } catch {
      /* invalid slot — DB already updated; email sends without .ics */
    }

    const sendResult = await sendEmailClient({
      to: requesterEmail.trim(),
      subject: acceptedPreview.subject,
      text: acceptedPreview.body,
      ...(ics != null ? { attachments: [{ filename: ics.filename, content: ics.content }] } : {}),
    });
    if (!sendResult.ok) {
      console.log(
        "EMAIL PREVIEW - REQUEST ACCEPTED (send failed, fallback)",
        acceptedPreview.subject,
        acceptedPreview.body,
        sendResult.error,
      );
      if (ics != null) {
        console.log("ICS PREVIEW - INTERVIEW ACCEPTED (send failed, fallback)", ics.filename, ics.content);
      }
    }
    router.refresh();
  }

  async function declineRequest(id: string, companyName: string, requesterEmail: string) {
    setActionError(null);
    const key = `${id}:decline`;
    setBusyKey(key);
    const { error } = await supabase.from("interview_requests").update({ status: "declined" }).eq("id", id);
    setBusyKey(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    const declinedPreview = interviewDeclinedEmail({ companyName });
    const sendResult = await sendEmailClient({
      to: requesterEmail.trim(),
      subject: declinedPreview.subject,
      text: declinedPreview.body,
    });
    if (!sendResult.ok) {
      console.log(
        "EMAIL PREVIEW - REQUEST DECLINED (send failed, fallback)",
        declinedPreview.subject,
        declinedPreview.body,
        sendResult.error,
      );
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}{" "}
          <span className="text-red-700/90">
            If this is a permission error, run{" "}
            <code className="rounded bg-red-100/80 px-1">006_dev_update_interview_status.sql</code> and{" "}
            <code className="rounded bg-red-100/80 px-1">007_selected_interview_slot.sql</code> for
            column + trigger.
          </span>
        </p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {initialRows.map((row) => {
          const statusLower = row.status.toLowerCase();
          const isRequested = statusLower === "requested";
          const isAccepted = statusLower === "accepted";
          const isDeclined = statusLower === "declined";
          const rowBusy = busyKey != null && busyKey.startsWith(`${row.id}:`);
          return (
            <li
              key={row.id}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/5"
            >
              <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-zinc-950">
                    {row.company_name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {row.requester_name}{" "}
                    <span className="text-zinc-400">·</span>{" "}
                    <a
                      href={`mailto:${row.requester_email}`}
                      className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                    >
                      {row.requester_email}
                    </a>
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses(row.status)}`}
                    >
                      {row.status}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {row.created_at
                        ? new Intl.DateTimeFormat("en-ZA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(row.created_at))
                        : "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isRequested ? (
                      <>
                        {slotProvided(row.proposed_slot_1) ? (
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() =>
                              void acceptWithSlot(
                                row.id,
                                row.company_name,
                                row.requester_email,
                                row.proposed_slot_1 as string,
                                1,
                              )
                            }
                            className="rounded-full bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busyKey === `${row.id}:accept-1` ? "…" : "Accept Option 1"}
                          </button>
                        ) : null}
                        {slotProvided(row.proposed_slot_2) ? (
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() =>
                              void acceptWithSlot(
                                row.id,
                                row.company_name,
                                row.requester_email,
                                row.proposed_slot_2 as string,
                                2,
                              )
                            }
                            className="rounded-full bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busyKey === `${row.id}:accept-2` ? "…" : "Accept Option 2"}
                          </button>
                        ) : null}
                        {slotProvided(row.proposed_slot_3) ? (
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() =>
                              void acceptWithSlot(
                                row.id,
                                row.company_name,
                                row.requester_email,
                                row.proposed_slot_3 as string,
                                3,
                              )
                            }
                            className="rounded-full bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busyKey === `${row.id}:accept-3` ? "…" : "Accept Option 3"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => void declineRequest(row.id, row.company_name, row.requester_email)}
                          className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-900 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busyKey === `${row.id}:decline` ? "…" : "Decline"}
                        </button>
                      </>
                    ) : isAccepted ? (
                      <p className="text-xs font-medium text-zinc-500">Interview accepted</p>
                    ) : isDeclined ? (
                      <p className="text-xs font-medium text-zinc-500">Interview declined</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Consultant</dt>
                  <dd className="mt-1 font-mono text-xs text-zinc-800">
                    {row.consultant_name != null && row.consultant_name.trim() !== ""
                      ? row.consultant_name
                      : "Consultant"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Request id
                  </dt>
                  <dd className="mt-1 font-mono text-xs text-zinc-800">{row.id}</dd>
                </div>
              </dl>

              {row.status.toLowerCase() === "accepted" && slotProvided(row.selected_slot) ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-950">
                  <span className="font-medium">Confirmed time:</span>{" "}
                  {formatSlot(row.selected_slot)}
                </div>
              ) : null}

              <div className="mt-4">
                <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Proposed slots
                </h2>
                <div className="mt-2 grid gap-2 text-sm text-zinc-800 sm:grid-cols-3">
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
                    <span className="text-xs text-zinc-500">Slot 1</span>
                    <p className="font-medium">{formatSlot(row.proposed_slot_1)}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
                    <span className="text-xs text-zinc-500">Slot 2</span>
                    <p className="font-medium">{formatSlot(row.proposed_slot_2)}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2">
                    <span className="text-xs text-zinc-500">Slot 3</span>
                    <p className="font-medium">{formatSlot(row.proposed_slot_3)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-zinc-100 pt-4">
                <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Message</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {row.message?.trim() ? row.message : "—"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
