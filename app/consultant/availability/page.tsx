"use client";

// Day-based MVP (available_from + resource_blocked_dates). Legacy resource_availability (012) is unused — see supabase/sql/013_day_based_availability_mvp.sql

import { AppTopNav } from "@/components/app-top-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

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

const ACCENT = "#ff6a00";

const inputDark =
  "min-w-0 rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-2.5 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/25";

const subCard =
  "rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-inner shadow-black/20 backdrop-blur-sm md:p-6";

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
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {WEEKDAY_LABELS_MON.map((w) => (
          <div
            key={w}
            className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-white/40 sm:py-2 sm:text-[11px]"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid min-w-0 grid-cols-7 gap-0.5 sm:gap-1">
        {cells.map((cell, idx) => {
          const blocked = blockedByIso.get(cell.iso);
          const isToday = cell.iso === todayIso;
          const busy = busyIso === cell.iso;
          const isBlocked = blocked != null;

          const base =
            "relative flex min-h-[2.5rem] flex-col items-center justify-center rounded-lg border text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a] disabled:cursor-wait disabled:opacity-60 sm:min-h-[3rem] sm:rounded-xl sm:text-sm";

          let cls = base;
          if (isBlocked) {
            cls += isToday
              ? " border-[#ff6a00] bg-gradient-to-br from-orange-600 to-orange-950 text-white shadow-lg shadow-black/30 ring-2 ring-[#ff6a00]/60 ring-offset-2 ring-offset-[#0b0f1a]"
              : " border-orange-700/50 bg-gradient-to-br from-orange-600 to-orange-950 text-white shadow-md shadow-black/25";
          } else if (cell.inCurrentMonth) {
            cls += isToday
              ? " border-white/15 bg-white/[0.08] text-white ring-2 ring-[#ff6a00]/55 ring-offset-2 ring-offset-[#0b0f1a] hover:border-white/25 hover:bg-white/[0.11]"
              : " border-white/10 bg-white/[0.05] text-white/90 hover:border-white/18 hover:bg-white/[0.09]";
          } else {
            cls += isToday
              ? " border-white/[0.08] bg-white/[0.03] text-white/40 ring-2 ring-[#ff6a00]/45 ring-offset-2 ring-offset-[#0b0f1a] hover:bg-white/[0.05]"
              : " border-transparent bg-transparent text-white/28 hover:bg-white/[0.04] hover:text-white/42";
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
                <span className="mt-0.5 hidden text-[9px] font-bold uppercase tracking-wide text-orange-100/95 sm:inline sm:text-[10px]">
                  Blocked
                </span>
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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
  }, [supabase]);

  const loadResource = useCallback(
    async (trimmed: string) => {
      setDashboardEmail(trimmed);
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
    [fetchBlocked, supabase],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      const trimmed = user?.email?.trim();
      if (!trimmed) {
        setError("Your account has no email address. Add an email to your Procal login to manage availability.");
        setDashboardEmail(null);
        setLoading(false);
        return;
      }
      await loadResource(trimmed);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, loadResource]);

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
      <AppTopNav variant="hero" />
      <div className="relative min-h-screen overflow-y-auto bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -top-28 left-1/2 h-[min(52vh,26rem)] w-[min(130%,44rem)] -translate-x-1/2 rounded-full opacity-90 blur-3xl"
            style={{
              background: `radial-gradient(closest-side, rgba(255,106,0,0.12), transparent 72%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-black" />
        </div>
        <div className="pointer-events-none fixed inset-0 z-[1] bg-black/50 backdrop-blur-sm" aria-hidden />

        <main className="relative z-[2] mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 pb-16 sm:px-6 sm:py-10 md:pb-20">
          <div className="w-full rounded-3xl border border-white/10 bg-[#0b0f1a]/90 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8 md:p-10">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ff6a00] sm:text-[11px]">
                  ProCal · Talent
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Set your availability</h1>
                <p className="max-w-xl text-sm leading-relaxed text-white/55">
                  Manage when companies can request your time.
                </p>
                {dashboardEmail != null ? (
                  <p className="text-xs text-white/40">Showing talent profile for {dashboardEmail}</p>
                ) : null}
              </div>
              <Link
                href="/consultant"
                className="shrink-0 text-sm font-medium text-white/50 transition hover:text-[#ff6a00]"
              >
                Back to Talent Dashboard
              </Link>
            </header>

            <div className="mt-6 space-y-5">
              {loading ? (
                <p className="text-sm text-white/50">Loading availability…</p>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                  {error}
                </p>
              ) : null}

              {noProfile ? (
                <div className={subCard}>
                  <p className="text-sm text-white/70">No talent profile found for this email.</p>
                  <Link
                    href="/consultant"
                    className="mt-4 inline-block text-sm font-medium text-[#ff6a00] hover:underline"
                  >
                    Back to Talent Dashboard
                  </Link>
                </div>
              ) : null}

              {ambiguous ? (
                <div className={`${subCard} border-amber-500/20 bg-amber-950/15`}>
                  <p className="text-sm text-amber-100/90">
                    Multiple profiles match this email. Contact support to manage availability.
                  </p>
                </div>
              ) : null}

              {notClaimed ? (
                <div className={subCard}>
                  <p className="text-sm font-medium text-white">Please claim your profile first</p>
                  <p className="mt-2 text-sm text-white/55">
                    After you verify your email and claim your listing, you can set availability here.
                  </p>
                  <Link
                    href="/consultant/claim"
                    className="mt-5 inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
                    style={{ backgroundColor: ACCENT }}
                  >
                    Claim profile
                  </Link>
                </div>
              ) : null}

              {canManage ? (
                <>
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/60">
                    Companies see your earliest available date and any blocked full days. Interview requests can still
                    be reviewed manually.
                  </p>

                  <section className={subCard}>
                    <h2 className="text-sm font-semibold text-white">Available from</h2>
                    <p className="mt-1 text-xs text-white/50">
                      Set the first date you are available for new work.
                    </p>
                    <form
                      onSubmit={(e) => void handleSaveAvailableFrom(e)}
                      className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
                    >
                      <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
                        <span className="font-medium text-white/55">Date</span>
                        <input
                          type="date"
                          value={availableFrom}
                          onChange={(e) => setAvailableFrom(e.target.value)}
                          className={inputDark}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={saveFromBusy}
                        className="inline-flex shrink-0 items-center justify-center rounded-2xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {saveFromBusy ? "Saving…" : "Save"}
                      </button>
                    </form>
                    <p className="mt-3 text-xs text-white/40">Leave the date empty and save to clear your start date.</p>
                  </section>

                  <section className={subCard}>
                    <h2 className="text-base font-semibold text-white">Blocked days</h2>
                    <p className="mt-1 text-xs text-white/50">
                      Tap dates on the calendar to block or unblock full days. Optional range blocking for longer
                      stretches.
                    </p>

                    <label className="mt-5 flex flex-col gap-2 text-sm">
                      <span className="font-medium text-white/70">Default reason</span>
                      <span className="text-xs font-normal text-white/45">
                        Applied when you block a day from the calendar. Leave empty to store no reason.
                      </span>
                      <input
                        type="text"
                        value={defaultBlockReason}
                        onChange={(e) => setDefaultBlockReason(e.target.value)}
                        placeholder="e.g. Leave, heads-down work"
                        className={inputDark}
                      />
                    </label>

                    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/35 p-3 sm:p-5">
                      <div className="flex min-w-[min(100%,18rem)] flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleMonth(({ year, month }) => {
                              const d = new Date(year, month - 1, 1);
                              return { year: d.getFullYear(), month: d.getMonth() };
                            })
                          }
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                        >
                          ← Previous
                        </button>
                        <h3 className="min-w-0 flex-1 text-center text-sm font-semibold tracking-tight text-white sm:text-base">
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
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                        >
                          Next →
                        </button>
                      </div>
                      <div className="pt-4">
                        {dataLoading ? (
                          <p className="py-12 text-center text-sm text-white/45">Loading calendar…</p>
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

                    <div className={`${subCard} mt-6 border-white/[0.08] bg-black/25`}>
                      <h3 className="text-sm font-semibold text-white">Block a date range</h3>
                      <p className="mt-1 text-xs text-white/50">
                        Use this for leave, confirmed work, or unavailable periods.
                      </p>
                      <p className="mt-2 text-xs text-white/40">
                        Start date is required. Leave end empty to block only that day. Duplicates are skipped.
                      </p>
                      <form
                        onSubmit={(e) => void handleRangeBlock(e)}
                        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
                      >
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-medium text-white/70">Start date</span>
                          <input
                            required
                            type="date"
                            value={rangeStart}
                            onChange={(e) => {
                              setRangeFieldError(null);
                              setRangeStart(e.target.value);
                            }}
                            className={inputDark}
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-medium text-white/70">End date (optional)</span>
                          <input
                            type="date"
                            value={rangeEnd}
                            onChange={(e) => {
                              setRangeFieldError(null);
                              setRangeEnd(e.target.value);
                            }}
                            className={inputDark}
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                          <span className="font-medium text-white/70">Reason (optional)</span>
                          <input
                            type="text"
                            value={rangeReason}
                            onChange={(e) => setRangeReason(e.target.value)}
                            placeholder="e.g. Annual leave"
                            className={inputDark}
                          />
                        </label>
                        <div className="sm:col-span-2">
                          <button
                            type="submit"
                            disabled={rangeBusy}
                            className="inline-flex items-center justify-center rounded-2xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
                            style={{ backgroundColor: ACCENT }}
                          >
                            {rangeBusy ? "Blocking…" : "Block date range"}
                          </button>
                        </div>
                      </form>
                      {rangeFieldError ? (
                        <p className="mt-3 text-sm text-red-300/95" role="alert">
                          {rangeFieldError}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-8 border-t border-white/10 pt-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-white/45">Blocked dates</h3>
                      {dataLoading ? (
                        <p className="mt-3 text-sm text-white/45">Loading…</p>
                      ) : blockedRows.length === 0 ? (
                        <p className="mt-3 text-sm text-white/50">No blocked days yet.</p>
                      ) : (
                        <ul className="mt-3 flex flex-col gap-2">
                          {blockedRows.map((r) => (
                            <li
                              key={r.id}
                              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm font-medium text-white">{formatDate(r.blocked_date)}</p>
                                {r.reason?.trim() ? (
                                  <p className="mt-0.5 text-xs text-white/50">{r.reason.trim()}</p>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                disabled={deleteBusyId === r.id}
                                onClick={() => void handleDeleteBlocked(r.id)}
                                className="self-start rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/55 transition hover:border-red-500/40 hover:bg-red-950/35 hover:text-red-200 disabled:opacity-50 sm:self-center"
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
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
