"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

const DAY_START_MIN = 9 * 60;
const DAY_END_MIN = 20 * 60;
const STEP_MIN = 30;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime24(totalMin: number) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function startOfLocalDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(base: Date, days: number) {
  const x = new Date(base);
  x.setDate(x.getDate() + days);
  return x;
}

function getNext7Days(from: Date): Date[] {
  const start = startOfLocalDay(from);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function calendarDayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sameLocalCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function combineLocalDateAndMinutes(date: Date, minutesFromMidnight: number) {
  const d = startOfLocalDay(date);
  return new Date(d.getTime() + minutesFromMidnight * 60 * 1000);
}

function slotMinutesList(): number[] {
  const out: number[] = [];
  for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += STEP_MIN) {
    out.push(m);
  }
  return out;
}

/** Always align the rail with the first offered slot (09:00), not `offsetLeft` (wrong offsetParent). */
function scrollTimeRailToSlot(container: HTMLElement, slotMinute: number) {
  const target = container.querySelector(`[data-slot-min="${slotMinute}"]`) as HTMLElement | null;
  if (!target) return;
  const cRect = container.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();
  const next = tRect.left - cRect.left + container.scrollLeft - 12;
  container.scrollLeft = Math.max(0, next);
}

function formatOptionDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export type InterviewDurationMin = 30 | 60;

function formatTimeFromDate(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Summary line for one selected start time; 60 min shows a local time range. */
function formatSlotSummary(iso: string, durationMin: InterviewDurationMin) {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return iso;
  if (durationMin === 30) {
    return formatOptionDateTime(iso);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const datePart = new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(start);
  return `${datePart}, ${formatTimeFromDate(start)}–${formatTimeFromDate(end)}`;
}

export type InterviewSlotPickerProps = {
  selectedSlots: string[];
  onChange: (slots: string[]) => void;
};

export function InterviewSlotPicker({ selectedSlots, onChange }: InterviewSlotPickerProps) {
  const days = useMemo(() => getNext7Days(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(() => days[0] ?? new Date());
  const [durationMin, setDurationMin] = useState<InterviewDurationMin>(30);
  const slotMinutes = useMemo(() => slotMinutesList(), []);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedDateKey = calendarDayKey(selectedDate);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    scrollTimeRailToSlot(container, DAY_START_MIN);
  }, [selectedDateKey]);

  function isSlotInPast(minutesFromMidnight: number) {
    const now = new Date();
    if (!sameLocalCalendarDay(selectedDate, now)) return false;
    const slotEnd = combineLocalDateAndMinutes(selectedDate, minutesFromMidnight + STEP_MIN);
    return slotEnd.getTime() <= now.getTime();
  }

  function isoForSlot(minutesFromMidnight: number) {
    return combineLocalDateAndMinutes(selectedDate, minutesFromMidnight).toISOString();
  }

  function toggleSlot(minutesFromMidnight: number) {
    if (isSlotInPast(minutesFromMidnight)) return;
    const iso = isoForSlot(minutesFromMidnight);
    const idx = selectedSlots.indexOf(iso);
    if (idx >= 0) {
      onChange(selectedSlots.filter((_, i) => i !== idx));
      return;
    }
    if (selectedSlots.length >= 3) return;
    onChange([...selectedSlots, iso]);
  }

  function slotSelectedOnThisDay(minutesFromMidnight: number) {
    return selectedSlots.includes(isoForSlot(minutesFromMidnight));
  }

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-stretch md:gap-6">
      {/* Date column / mobile: horizontal strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:max-h-[min(24rem,55vh)] md:w-[5.75rem] md:shrink-0 md:flex-col md:overflow-y-auto md:overflow-x-visible md:pr-1 [&::-webkit-scrollbar]:hidden"
        aria-label="Choose a day"
      >
        {days.map((d) => {
          const active = calendarDayKey(d) === selectedDateKey;
          const wk = new Intl.DateTimeFormat("en-ZA", { weekday: "short" }).format(d);
          const mon = new Intl.DateTimeFormat("en-ZA", { month: "short" }).format(d);
          return (
            <button
              key={calendarDayKey(d)}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedDate(d)}
              className={`flex min-w-[4.75rem] shrink-0 flex-col items-center rounded-xl border px-2.5 py-2.5 text-center transition md:min-w-0 md:px-2 ${
                active
                  ? "border-orange-400/90 bg-orange-50 shadow-sm shadow-orange-950/5 ring-2 ring-orange-400/70"
                  : "border-zinc-200/90 bg-white hover:border-zinc-300 hover:bg-zinc-50/80"
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-orange-800" : "text-zinc-500"}`}
              >
                {wk}
              </span>
              <span className={`mt-0.5 text-lg font-semibold tabular-nums ${active ? "text-zinc-950" : "text-zinc-800"}`}>
                {d.getDate()}
              </span>
              <span className={`text-[11px] font-medium ${active ? "text-orange-900/90" : "text-zinc-600"}`}>{mon}</span>
            </button>
          );
        })}
      </div>

      {/* Time rail */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-xs font-medium text-zinc-600">
          Times in your timezone · scroll to see slots until 20:00
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Duration</span>
          <div className="flex gap-1.5">
            {([30, 60] as const).map((m) => {
              const active = durationMin === m;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDurationMin(m)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums transition ${
                    active
                      ? "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-950/10"
                      : "border-zinc-200/90 bg-white text-zinc-800 hover:border-orange-200 hover:bg-orange-50/50"
                  }`}
                >
                  {m} min
                </button>
              );
            })}
          </div>
        </div>
        <div
          ref={scrollRef}
          className="-mx-0.5 flex gap-2 overflow-x-auto overflow-y-visible px-0.5 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] md:mx-0 md:px-0"
        >
          {slotMinutes.map((m) => {
            const past = isSlotInPast(m);
            const selected = slotSelectedOnThisDay(m);
            return (
              <button
                key={m}
                type="button"
                data-slot-min={m}
                aria-pressed={selected}
                disabled={past}
                onClick={() => toggleSlot(m)}
                className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-semibold tabular-nums transition disabled:cursor-not-allowed disabled:opacity-35 ${
                  selected
                    ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-950/15"
                    : "border-zinc-200/90 bg-white text-zinc-800 hover:border-orange-200 hover:bg-orange-50/40"
                }`}
              >
                {formatTime24(m)}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-zinc-200/90 bg-white/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your selections</p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
            {selectedSlots.length === 0 ? (
              <li className="text-zinc-500">No times selected yet — pick up to three slots.</li>
            ) : (
              selectedSlots.map((iso, i) => (
                <li key={`${iso}-${i}`} className="flex gap-2">
                  <span className="shrink-0 font-semibold text-orange-900/90">Option {i + 1}</span>
                  <span className="text-zinc-700">{formatSlotSummary(iso, durationMin)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function slotsToProposedColumns(slots: string[]): {
  proposed_slot_1: string | null;
  proposed_slot_2: string | null;
  proposed_slot_3: string | null;
} {
  return {
    proposed_slot_1: slots[0] ?? null,
    proposed_slot_2: slots[1] ?? null,
    proposed_slot_3: slots[2] ?? null,
  };
}
