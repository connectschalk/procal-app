"use client";

import { useMemo, useState } from "react";

const WEEKDAY_LABELS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type PublicBlockedDate = { blocked_date: string; reason?: string | null };

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

function formatMedium(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d);
}

type CellKind = "blocked" | "not_yet" | "available" | "outside_muted";

function buildMonthCells(year: number, month: number) {
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
  return cells;
}

export function PublicAvailabilityCalendar({
  availableFrom,
  blockedDates,
}: {
  availableFrom: string | null;
  blockedDates: PublicBlockedDate[];
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const blockedByIso = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const b of blockedDates) {
      const iso = String(b.blocked_date).slice(0, 10);
      if (!ISO_DATE_RE.test(iso)) continue;
      const r = b.reason;
      const trimmed = typeof r === "string" && r.trim() !== "" ? r.trim() : null;
      m.set(iso, trimmed);
    }
    return m;
  }, [blockedDates]);

  const hasAnyBlocked = blockedByIso.size > 0;
  const fromRaw =
    availableFrom != null && String(availableFrom).trim() !== ""
      ? String(availableFrom).trim().slice(0, 10)
      : null;
  const effectiveFrom = fromRaw != null && ISO_DATE_RE.test(fromRaw) ? fromRaw : null;
  const todayIso = localIsoToday();

  const cells = useMemo(
    () => buildMonthCells(visibleMonth.year, visibleMonth.month),
    [visibleMonth.year, visibleMonth.month],
  );

  function kindForCell(iso: string, inCurrentMonth: boolean): CellKind {
    if (blockedByIso.has(iso)) return "blocked";
    if (effectiveFrom != null && iso < effectiveFrom) return "not_yet";
    if (!inCurrentMonth) return "outside_muted";
    return "available";
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/[0.04] md:p-8">
      <h2 className="text-sm font-semibold text-zinc-900">Availability</h2>

      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium text-zinc-800">
          Available from:{" "}
          <span className="text-zinc-950">
            {effectiveFrom != null ? formatMedium(effectiveFrom) : "Not specified"}
          </span>
        </p>
        <p className="text-xs leading-relaxed text-zinc-500">
          This calendar shows published availability. Final scheduling is confirmed after request review.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-100 bg-gradient-to-b from-zinc-50/80 to-white p-4 shadow-inner shadow-zinc-950/[0.02] md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100/90 pb-4">
          <button
            type="button"
            aria-label="Previous month"
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
            aria-label="Next month"
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

        <div className="select-none pt-4" role="grid" aria-label="Availability calendar">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS_MON.map((w) => (
              <div
                key={w}
                className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                role="columnheader"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1" role="rowgroup">
            {cells.map((cell, idx) => {
              const kind = kindForCell(cell.iso, cell.inCurrentMonth);
              const isToday = cell.iso === todayIso;
              const reason = blockedByIso.get(cell.iso) ?? null;

              let title: string;
              if (kind === "blocked") {
                title = reason != null ? `Blocked: ${reason}` : "Blocked (unavailable)";
              } else if (kind === "not_yet") {
                title = "Not available yet";
              } else if (kind === "outside_muted") {
                title = formatMedium(cell.iso);
              } else {
                title = `Available — ${formatMedium(cell.iso)}`;
              }

              const base =
                "relative flex min-h-[3rem] flex-col items-center justify-center rounded-xl border text-sm font-medium";

              let cls = `${base} `;
              if (kind === "blocked") {
                cls +=
                  " border-orange-800/80 bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-md shadow-orange-950/20";
              } else if (kind === "not_yet") {
                cls += " border-zinc-200/60 bg-zinc-100/80 text-zinc-500";
              } else if (kind === "outside_muted") {
                cls += " border-transparent bg-zinc-50/50 text-zinc-400";
              } else {
                cls += " border-zinc-200/90 bg-white text-zinc-900";
              }

              if (isToday) {
                cls += " ring-2 ring-orange-400/90 ring-offset-2 ring-offset-white";
              }

              return (
                <div
                  key={`pub-cal-${visibleMonth.year}-${visibleMonth.month}-${idx}`}
                  role="gridcell"
                  title={title}
                  aria-label={title}
                  className={cls}
                >
                  <span className="tabular-nums">{cell.label}</span>
                  {kind === "blocked" ? (
                    <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-100">
                      Blocked
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-zinc-100 pt-5">
        {!hasAnyBlocked ? (
          <p className="text-sm text-zinc-600">No blocked days published.</p>
        ) : (
          <p className="text-xs leading-relaxed text-zinc-500">
            Blocked days are shown on the calendar. Hover a day for details when a reason was provided.
          </p>
        )}
      </div>
    </div>
  );
}
