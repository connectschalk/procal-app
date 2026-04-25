"use client";

// Day-based MVP (available_from + resource_blocked_dates). Legacy resource_availability (012) is unused — see supabase/sql/013_day_based_availability_mvp.sql

import { AppTopNav } from "@/components/app-top-nav";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

const STORAGE_KEY = "procal.consultantEmail";

type BlockedRow = {
  id: string;
  blocked_date: string;
  reason: string | null;
};

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d);
}

const WEEKDAY_LABELS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 800;

function localIsoFromYmd(year: number, monthIndex: number, day: number): string {
  const d = new Date(year, monthIndex, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dayStr = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayStr}`;
}

function localIsoToday(): string {
  const n = new Date();
  return localIsoFromYmd(n.getFullYear(), n.getMonth(), n.getDate());
}

function expandInclusiveRange(startIso: string, endIso: string): string[] {
  const start = startIso.trim().slice(0, 10);
  let end = endIso.trim().slice(0, 10);
  if (!ISO_DATE_RE.test(start)) return [];
  if (!ISO_DATE_RE.test(end)) end = start;
  if (end < start) return [];

  const out: string[] = [];
  const cur = new Date(`${start}T12:00:00`);
  const endD = new Date(`${end}T12:00:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(endD.getTime())) return [start];

  while (cur <= endD) {
    if (out.length >= MAX_RANGE_DAYS) break;
    out.push(localIsoFromYmd(cur.getFullYear(), cur.getMonth(), cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

type CalendarMonthGridProps = {
  year: number;
  month: number;
  blockedByIso: Map<string, BlockedRow>;
  todayIso: string;
  busyIso: string | null;
  onDayClick: (iso: string) => void;
};

function CalendarMonthGrid({ year, month, blockedByIso, todayIso, busyIso, onDayClick }: CalendarMonthGridProps) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

  const cells: { iso: string; label: number; inCurrentMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < startPad) {
      const pMonth = month === 0 ? 11 : month - 1;
      const pYear = month === 0 ? year - 1 : year;
      const day = daysInPrevMonth - startPad + i + 1;
      cells.push({
        iso: localIsoFromYmd(pYear, pMonth, day),
        label: day,
        inCurrentMonth: false,
      });
    } else {
      const mi = i - startPad;
      if (mi < daysInMonth) {
        cells.push({
          iso: localIsoFromYmd(year, month, mi + 1),
          label: mi + 1,
          inCurrentMonth: true,
        });
      } else {
        const nIndex = mi - daysInMonth;
        const nMonth = month === 11 ? 0 : month + 1;
        const nYear = month === 11 ? year + 1 : year;
        cells.push({
          iso: localIsoFromYmd(nYear, nMonth, nIndex + 1),
          label: nIndex + 1,
          inCurrentMonth: false,
        });
      }
    }
  }

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS_MON.map((w) => (
          <div key={w} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const blocked = blockedByIso.get(cell.iso);
          const isToday = cell.iso === todayIso;
          const busy = busyIso === cell.iso;
          const isBlocked = blocked != null;

          const base =
            "relative flex min-h-[3rem] flex-col items-center justify-center rounded-xl border text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60";

          let cls = base;
          if (isBlocked) {
            cls += isToday
              ? " border-orange-900 bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-md shadow-orange-950/25 ring-2 ring-orange-300 ring-offset-2 ring-offset-white"
              : " border-orange-800/80 bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-md shadow-orange-950/20";
          } else if (cell.inCurrentMonth) {
            cls += isToday
              ? " border-zinc-200 bg-white text-zinc-900 ring-2 ring-orange-400/90 ring-offset-2 ring-offset-white hover:border-orange-200 hover:bg-orange-50/40"
              : " border-zinc-200/90 bg-white text-zinc-900 hover:border-orange-200 hover:bg-zinc-50/80";
          } else {
            cls += isToday
              ? " border-zinc-100 bg-zinc-50/90 text-zinc-400 ring-2 ring-orange-300/70 ring-offset-1 ring-offset-white hover:bg-zinc-100"
              : " border-transparent bg-zinc-50/40 text-zinc-400 hover:bg-zinc-100/80";
          }

          return (
            <button
              key={`cal-${year}-${month}-${idx}`}
              type="button"
              disabled={busy}
              aria-pressed={isBlocked}
              aria-label={
                isBlocked
                  ? `${cell.iso}, blocked. Click to remove block.`
                  : `${cell.iso}, available. Click to block.`
              }
              onClick={() => onDayClick(cell.iso)}
              className={cls}
            >
              <span className="tabular-nums">{cell.label}</span>
              {isBlocked ? (
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-100">Blocked</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

async function callUpdateAvailability(
  body: Record<string, unknown>,
  options?: { treatDuplicateBlockedAsOk?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/update-availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data: { success?: boolean; error?: string } = {};
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    /* ignore */
  }
  if (data.success === true) return { ok: true };
  if (
    options?.treatDuplicateBlockedAsOk === true &&
    res.status === 409 &&
    typeof data.error === "string" &&
    data.error.toLowerCase().includes("already blocked")
  ) {
    return { ok: true };
  }
  if (!res.ok) {
    const err =
      typeof data.error === "string" && data.error.trim() !== "" ? data.error : `Request failed (${res.status})`;
    return { ok: false, error: err };
  }
  const err =
    typeof data.error === "string" && data.error.trim() !== "" ? data.error : "Request did not succeed";
  return { ok: false, error: err };
}

export default function ConsultantAvailabilityPage() {
  const [email, setEmail] = useState("");
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [blockedRows, setBlockedRows] = useState<BlockedRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const [notClaimed, setNotClaimed] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const [saveFromBusy, setSaveFromBusy] = useState(false);
  const [defaultBlockReason, setDefaultBlockReason] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [cellBusyIso, setCellBusyIso] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeReason, setRangeReason] = useState("");
  const [rangeBusy, setRangeBusy] = useState(false);
  const [rangeFieldError, setRangeFieldError] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const blockedByIso = useMemo(() => {
    const m = new Map<string, BlockedRow>();
    for (const r of blockedRows) {
      m.set(String(r.blocked_date).slice(0, 10), r);
    }
    return m;
  }, [blockedRows]);

  const todayIso = localIsoToday();

  const fetchBlocked = useCallback(async (rid: string, showCalendarLoading = true) => {
    if (showCalendarLoading) setDataLoading(true);
    const { data, error: qErr } = await supabase
      .from("resource_blocked_dates")
      .select("id, blocked_date, reason")
      .eq("resource_id", rid)
      .order("blocked_date", { ascending: true });
    if (showCalendarLoading) setDataLoading(false);
    if (qErr) {
      setError(qErr.message);
      setBlockedRows([]);
      return;
    }
    setBlockedRows(
      (data ?? []).map((r) => ({
        id: r.id as string,
        blocked_date: String(r.blocked_date).slice(0, 10),
        reason: (r.reason as string | null) ?? null,
      })),
    );
  }, []);

  const loadResource = useCallback(
    async (trimmed: string) => {
      setEmail(trimmed);
      setLoading(true);
      setError(null);
      setNoProfile(false);
      setAmbiguous(false);
      setNotClaimed(false);
      setCanManage(false);
      setResourceId(null);
      setAvailableFrom("");
      setBlockedRows([]);

      const { data, error: fetchError } = await supabase
        .from("resources")
        .select("id, claimed, available_from")
        .ilike("contact_email", trimmed);

      setLoading(false);

      if (fetchError) {
        setError(fetchError.message);
        setDashboardEmail(null);
        return;
      }

      const list = data ?? [];
      if (list.length === 0) {
        setNoProfile(true);
        setDashboardEmail(trimmed);
        return;
      }
      if (list.length > 1) {
        setAmbiguous(true);
        setDashboardEmail(trimmed);
        return;
      }

      const row = list[0] as { id: string; claimed: boolean | null; available_from: string | null };
      setDashboardEmail(trimmed);

      if (row.claimed !== true) {
        setNotClaimed(true);
        return;
      }

      setCanManage(true);
      setResourceId(row.id);
      const now = new Date();
      setVisibleMonth({ year: now.getFullYear(), month: now.getMonth() });
      const af = row.available_from;
      setAvailableFrom(af != null && String(af).trim() !== "" ? String(af).slice(0, 10) : "");
      await fetchBlocked(row.id);
    },
    [fetchBlocked],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const trimmed = stored?.trim();
      if (trimmed) {
        queueMicrotask(() => {
          void loadResource(trimmed);
        });
      }
    } catch {
      /* ignore */
    }
  }, [loadResource]);

  async function handleLoadEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
    await loadResource(trimmed);
  }

  function handleChangeEmail() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setEmail("");
    setDashboardEmail(null);
    setResourceId(null);
    setAvailableFrom("");
    setBlockedRows([]);
    setError(null);
    setNoProfile(false);
    setAmbiguous(false);
    setNotClaimed(false);
    setCanManage(false);
    setDefaultBlockReason("");
    setVisibleMonth(() => {
      const n = new Date();
      return { year: n.getFullYear(), month: n.getMonth() };
    });
    setRangeStart("");
    setRangeEnd("");
    setRangeReason("");
    setRangeFieldError(null);
  }

  async function handleSaveAvailableFrom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dashboardEmail?.trim()) return;
    setError(null);
    setSaveFromBusy(true);
    const result = await callUpdateAvailability({
      email: dashboardEmail.trim(),
      action: "set_available_from",
      available_from: availableFrom.trim() === "" ? null : availableFrom.trim(),
    });
    setSaveFromBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
  }

  async function handleCalendarDayClick(iso: string) {
    if (!dashboardEmail?.trim()) return;
    setError(null);
    setCellBusyIso(iso);
    const existing = blockedByIso.get(iso);
    try {
      if (existing != null) {
        const result = await callUpdateAvailability({
          email: dashboardEmail.trim(),
          action: "delete_blocked",
          id: existing.id,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const trimmedReason = defaultBlockReason.trim();
        const result = await callUpdateAvailability(
          {
            email: dashboardEmail.trim(),
            action: "add_blocked",
            blocked_date: iso,
            ...(trimmedReason !== "" ? { reason: trimmedReason } : {}),
          },
          { treatDuplicateBlockedAsOk: true },
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      if (resourceId) await fetchBlocked(resourceId, false);
    } finally {
      setCellBusyIso(null);
    }
  }

  async function handleRangeBlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dashboardEmail?.trim()) return;
    setRangeFieldError(null);
    setError(null);

    const start = rangeStart.trim().slice(0, 10);
    if (!start || !ISO_DATE_RE.test(start)) {
      setRangeFieldError("Start date is required (use a valid date).");
      return;
    }
    let end = rangeEnd.trim().slice(0, 10);
    if (end !== "" && !ISO_DATE_RE.test(end)) {
      setRangeFieldError("End date must be a valid date or empty.");
      return;
    }
    if (end !== "" && end < start) {
      setRangeFieldError("End date cannot be before start date.");
      return;
    }
    if (end === "") end = start;

    const startCount = new Date(`${start}T12:00:00`);
    const endCount = new Date(`${end}T12:00:00`);
    const spanDays = Math.floor((endCount.getTime() - startCount.getTime()) / 86400000) + 1;
    if (spanDays > MAX_RANGE_DAYS) {
      setRangeFieldError(`Range cannot exceed ${MAX_RANGE_DAYS} days. Try a shorter span.`);
      return;
    }

    const dates = expandInclusiveRange(start, end);
    if (dates.length === 0) {
      setRangeFieldError("No days in range.");
      return;
    }

    setRangeBusy(true);
    const trimmedReason = rangeReason.trim();
    try {
      for (const blocked_date of dates) {
        const result = await callUpdateAvailability(
          {
            email: dashboardEmail.trim(),
            action: "add_blocked",
            blocked_date,
            ...(trimmedReason !== "" ? { reason: trimmedReason } : {}),
          },
          { treatDuplicateBlockedAsOk: true },
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      setRangeStart("");
      setRangeEnd("");
      setRangeReason("");
      if (resourceId) await fetchBlocked(resourceId, false);
    } finally {
      setRangeBusy(false);
    }
  }

  async function handleDeleteBlocked(id: string) {
    if (!dashboardEmail?.trim()) return;
    setError(null);
    setDeleteBusyId(id);
    const result = await callUpdateAvailability({
      email: dashboardEmail.trim(),
      action: "delete_blocked",
      id,
    });
    setDeleteBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (resourceId) await fetchBlocked(resourceId, false);
  }

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">Availability</h1>
              <p className="text-sm leading-relaxed text-zinc-600">
                Set when you are generally available and block full days you cannot take meetings.
              </p>
            </div>
            {dashboardEmail != null ? (
              <button
                type="button"
                onClick={handleChangeEmail}
                className="shrink-0 self-start text-sm font-medium text-orange-700 underline-offset-2 hover:underline"
              >
                Change email
              </button>
            ) : null}
          </div>
          {dashboardEmail != null ? (
            <p className="text-xs text-zinc-500">Managing as: {dashboardEmail}</p>
          ) : null}
        </header>

        <form
          onSubmit={handleLoadEmail}
          className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 md:flex-row md:items-end md:gap-4 md:p-6"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800">Profile contact email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              disabled={canManage}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
            />
          </label>
          {!canManage ? (
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? "Loading…" : "Continue"}
            </button>
          ) : null}
        </form>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {noProfile ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            No talent profile found for this email.
          </p>
        ) : null}

        {ambiguous ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Multiple profiles match this email. Contact support to manage availability.
          </p>
        ) : null}

        {notClaimed ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-5 py-5 md:px-6">
            <p className="text-sm font-medium text-zinc-900">Please claim your profile first</p>
            <Link
              href="/consultant/claim"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Claim profile
            </Link>
          </div>
        ) : null}

        {canManage ? (
          <>
            <p className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 px-4 py-3 text-sm leading-relaxed text-zinc-700">
              Companies see your earliest available date and any blocked full days. Interview requests can still be
              reviewed manually.
            </p>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/[0.04] md:p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Available from</h2>
              <p className="mt-1 text-xs text-zinc-500">
                First date you are generally open for new work or conversations. Leave empty to clear.
              </p>
              <form onSubmit={(e) => void handleSaveAvailableFrom(e)} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                  <span className="font-medium text-zinc-800">Date</span>
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saveFromBusy}
                  className="shrink-0 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  {saveFromBusy ? "Saving…" : "Save"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/[0.04] md:p-6">
              <h2 className="text-sm font-semibold text-zinc-900">Blocked days</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Tap dates on the calendar to block or unblock full days. Optional range blocking for longer stretches.
              </p>

              <label className="mt-5 flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-800">Default reason</span>
                <span className="text-xs font-normal text-zinc-500">
                  Applied when you block a day from the calendar. Leave empty to store no reason.
                </span>
                <input
                  type="text"
                  value={defaultBlockReason}
                  onChange={(e) => setDefaultBlockReason(e.target.value)}
                  placeholder="e.g. Leave, heads-down work"
                  className="rounded-xl border border-zinc-200 bg-zinc-50/40 px-3 py-2.5 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:border-orange-200 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                />
              </label>

              <div className="mt-6 rounded-2xl border border-zinc-100 bg-gradient-to-b from-zinc-50/80 to-white p-4 shadow-inner shadow-zinc-950/[0.02] md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100/90 pb-4">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth(({ year, month }) => {
                        const d = new Date(year, month - 1, 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })
                    }
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:border-orange-200 hover:bg-orange-50/50"
                  >
                    ← Previous month
                  </button>
                  <h3 className="text-center text-base font-semibold tracking-tight text-zinc-950">
                    {new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(
                      new Date(visibleMonth.year, visibleMonth.month, 1),
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth(({ year, month }) => {
                        const d = new Date(year, month + 1, 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })
                    }
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm transition hover:border-orange-200 hover:bg-orange-50/50"
                  >
                    Next month →
                  </button>
                </div>
                <div className="pt-4">
                  {dataLoading ? (
                    <p className="py-12 text-center text-sm text-zinc-500">Loading calendar…</p>
                  ) : (
                    <CalendarMonthGrid
                      year={visibleMonth.year}
                      month={visibleMonth.month}
                      blockedByIso={blockedByIso}
                      todayIso={todayIso}
                      busyIso={cellBusyIso}
                      onDayClick={(iso) => void handleCalendarDayClick(iso)}
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-100 bg-white p-4 md:p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Block a date range</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Start date is required. Leave end empty to block only that day. Duplicates are skipped.
                </p>
                <form
                  onSubmit={(e) => void handleRangeBlock(e)}
                  className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium text-zinc-800">Start date</span>
                    <input
                      required
                      type="date"
                      value={rangeStart}
                      onChange={(e) => {
                        setRangeFieldError(null);
                        setRangeStart(e.target.value);
                      }}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-zinc-950 focus:border-orange-200 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium text-zinc-800">End date (optional)</span>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={(e) => {
                        setRangeFieldError(null);
                        setRangeEnd(e.target.value);
                      }}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-zinc-950 focus:border-orange-200 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                    <span className="font-medium text-zinc-800">Reason (optional)</span>
                    <input
                      type="text"
                      value={rangeReason}
                      onChange={(e) => setRangeReason(e.target.value)}
                      placeholder="e.g. Annual leave"
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:border-orange-200 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={rangeBusy}
                      className="rounded-full bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-950/15 transition hover:bg-orange-800 disabled:opacity-60"
                    >
                      {rangeBusy ? "Blocking…" : "Block date range"}
                    </button>
                  </div>
                </form>
                {rangeFieldError ? (
                  <p className="mt-3 text-sm text-red-700" role="alert">
                    {rangeFieldError}
                  </p>
                ) : null}
              </div>

              <div className="mt-8 border-t border-zinc-100 pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Blocked dates</h3>
                {dataLoading ? (
                  <p className="mt-3 text-sm text-zinc-500">Loading…</p>
                ) : blockedRows.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-600">No blocked days yet.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {blockedRows.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{formatDate(r.blocked_date)}</p>
                          {r.reason?.trim() ? (
                            <p className="mt-0.5 text-xs text-zinc-600">{r.reason.trim()}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={deleteBusyId === r.id}
                          onClick={() => void handleDeleteBlocked(r.id)}
                          className="self-start rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-900 transition hover:bg-red-50 disabled:opacity-50 sm:self-center"
                        >
                          {deleteBusyId === r.id ? "Removing…" : "Remove"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        ) : null}

        <p className="text-center text-xs text-zinc-500">
          <Link href="/consultant" className="font-medium text-orange-700 underline-offset-2 hover:underline">
            ← Talent Dashboard
          </Link>
        </p>
      </main>
    </>
  );
}
