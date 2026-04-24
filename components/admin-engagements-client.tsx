"use client";

import {
  engagementProposalAcceptedEmail,
  engagementProposalDeclinedEmail,
} from "@/lib/email-placeholders";
import { sendEmailClient } from "@/lib/send-email-client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminEngagementProposalRow = {
  id: string;
  resource_id: string;
  consultant_name: string | null;
  company_name: string;
  requester_name: string;
  requester_email: string;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  scope: string | null;
  proposed_rate: number | null;
  status: string;
  created_at: string;
};

function formatDate(value: string | null) {
  if (value == null || String(value).trim() === "") return "—";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d);
}

function formatRateZar(rate: number | null) {
  if (rate == null) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(rate);
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BLOCKED_DAYS_PER_ACCEPT = 800;

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Inclusive calendar days from start to end (ISO strings). Empty start → []. Invalid end → single start day. */
function expandEngagementBlockDates(
  proposedStart: string | null,
  proposedEnd: string | null,
): string[] {
  if (proposedStart == null || String(proposedStart).trim() === "") return [];
  const start = String(proposedStart).trim().slice(0, 10);
  if (!ISO_DATE_RE.test(start)) return [];

  let end =
    proposedEnd != null && String(proposedEnd).trim() !== ""
      ? String(proposedEnd).trim().slice(0, 10)
      : start;
  if (!ISO_DATE_RE.test(end)) end = start;
  if (end < start) end = start;

  const startD = new Date(`${start}T12:00:00`);
  const endD = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) return [start];

  const dates: string[] = [];
  const cursor = new Date(startD);
  while (cursor <= endD) {
    if (dates.length >= MAX_BLOCKED_DAYS_PER_ACCEPT) {
      console.error(
        "[admin-engagements] engagement date range exceeded max blocked days; remaining days skipped",
        { start, end, max: MAX_BLOCKED_DAYS_PER_ACCEPT },
      );
      break;
    }
    dates.push(localIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function insertBlockedDatesForAcceptedEngagement(
  resourceId: string,
  dates: string[],
  reason: string,
): Promise<void> {
  for (const blocked_date of dates) {
    const { error } = await supabase.from("resource_blocked_dates").insert({
      resource_id: resourceId,
      blocked_date,
      reason,
    });
    if (!error) continue;
    if (error.code === "23505") continue;
    console.error("[admin-engagements] resource_blocked_dates insert failed", error, {
      resourceId,
      blocked_date,
    });
  }
}

export function AdminEngagementsClient({ initialRows }: { initialRows: AdminEngagementProposalRow[] }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function setStatus(row: AdminEngagementProposalRow, status: "accepted" | "declined") {
    setActionError(null);
    const key = `${row.id}:${status}`;
    setBusyKey(key);
    const { error } = await supabase.from("engagement_proposals").update({ status }).eq("id", row.id);
    setBusyKey(null);
    if (error) {
      setActionError(error.message);
      return;
    }

    if (status === "accepted") {
      const dates = expandEngagementBlockDates(row.proposed_start_date, row.proposed_end_date);
      if (dates.length > 0) {
        const reason = `Engagement accepted: ${row.company_name}`;
        try {
          await insertBlockedDatesForAcceptedEngagement(row.resource_id, dates, reason);
        } catch (e) {
          console.error("[admin-engagements] resource_blocked_dates unexpected error", e);
        }
      }
    }

    const consultantName = row.consultant_name ?? "";
    if (status === "accepted") {
      const acceptedPreview = engagementProposalAcceptedEmail({
        companyName: row.company_name,
        consultantName,
      });
      const sendResult = await sendEmailClient({
        to: row.requester_email.trim(),
        subject: acceptedPreview.subject,
        text: acceptedPreview.body,
      });
      if (!sendResult.ok) {
        console.error("[admin-engagements] send-email failed (accepted)", sendResult);
        console.log(
          "EMAIL PREVIEW - ENGAGEMENT ACCEPTED (send failed, fallback)",
          acceptedPreview.subject,
          acceptedPreview.body,
        );
      }
    } else {
      const declinedPreview = engagementProposalDeclinedEmail({
        companyName: row.company_name,
        consultantName,
      });
      const sendResult = await sendEmailClient({
        to: row.requester_email.trim(),
        subject: declinedPreview.subject,
        text: declinedPreview.body,
      });
      if (!sendResult.ok) {
        console.error("[admin-engagements] send-email failed (declined)", sendResult);
        console.log(
          "EMAIL PREVIEW - ENGAGEMENT DECLINED (send failed, fallback)",
          declinedPreview.subject,
          declinedPreview.body,
        );
      }
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
            <code className="rounded bg-red-100/80 px-1">009_engagement_proposals_mvp.sql</code> in the
            Supabase SQL Editor so anon can SELECT and UPDATE (status only via trigger).
          </span>
        </p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {initialRows.map((row) => {
          const statusLower = row.status.toLowerCase();
          const isProposed = statusLower === "proposed";
          const rowBusy = busyKey != null && busyKey.startsWith(`${row.id}:`);
          return (
            <li
              key={row.id}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-950/5"
            >
              <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-zinc-950">{row.company_name}</p>
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
                  {isProposed ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() => void setStatus(row, "accepted")}
                        className="rounded-full bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busyKey === `${row.id}:accepted` ? "…" : "Accept"}
                      </button>
                      <button
                        type="button"
                        disabled={rowBusy}
                        onClick={() => void setStatus(row, "declined")}
                        className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-900 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busyKey === `${row.id}:declined` ? "…" : "Decline"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Consultant</dt>
                  <dd className="mt-1 text-zinc-800">
                    {row.consultant_name != null && row.consultant_name.trim() !== ""
                      ? row.consultant_name
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Proposed rate</dt>
                  <dd className="mt-1 text-zinc-800">{formatRateZar(row.proposed_rate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Start</dt>
                  <dd className="mt-1 text-zinc-800">{formatDate(row.proposed_start_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">End</dt>
                  <dd className="mt-1 text-zinc-800">{formatDate(row.proposed_end_date)}</dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-zinc-100 pt-4">
                <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Scope</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {row.scope?.trim() ? row.scope : "—"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
