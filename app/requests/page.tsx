"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { supabase } from "@/lib/supabase";
import { useState, type FormEvent } from "react";

type InterviewRequestRow = {
  id: string;
  resource_id: string;
  company_name: string;
  message: string | null;
  proposed_slot_1: string | null;
  proposed_slot_2: string | null;
  proposed_slot_3: string | null;
  selected_slot: string | null;
  status: string;
  created_at: string;
  consultant_name: string | null;
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

function RequestStatusTimeline({
  status,
  selectedSlot,
}: {
  status: string;
  selectedSlot: string | null;
}) {
  const s = status.toLowerCase();
  const isRequested = s === "requested";
  const isAccepted = s === "accepted";
  const isDeclined = s === "declined";

  const line12 = "bg-zinc-300";
  const line23 =
    isRequested ? "bg-zinc-200" : isAccepted ? "bg-emerald-200" : isDeclined ? "bg-red-200" : "bg-zinc-200";

  const dot1 = "bg-zinc-900 ring-2 ring-zinc-900/15";
  const dot2 =
    isRequested ? "bg-zinc-900 ring-2 ring-zinc-400/80 ring-offset-2 ring-offset-zinc-50" : "bg-zinc-900 ring-2 ring-zinc-900/15";
  const dot3 = isAccepted
    ? "bg-emerald-600 ring-2 ring-emerald-600/20"
    : isDeclined
      ? "bg-red-600 ring-2 ring-red-600/20"
      : "border-2 border-zinc-300 bg-white";

  const label3 = isAccepted ? "Accepted" : isDeclined ? "Declined" : "Decision";
  const label3Class = isAccepted
    ? "font-medium text-emerald-900"
    : isDeclined
      ? "font-medium text-red-900"
      : "text-zinc-500";

  const showConfirmed =
    isAccepted && selectedSlot != null && String(selectedSlot).trim() !== "";

  return (
    <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Status</p>
      <div className="flex min-w-0 items-stretch gap-0" aria-label="Interview request progress">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot1}`} aria-hidden />
          <span className="text-[11px] font-medium leading-snug text-zinc-800">Request submitted</span>
        </div>
        <div className="flex w-5 shrink-0 flex-col pt-1" aria-hidden>
          <div className={`mt-1 h-0.5 w-full rounded-full ${line12}`} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot2}`} aria-hidden />
          <span
            className={`text-[11px] leading-snug ${isRequested ? "font-semibold text-zinc-900" : "font-medium text-zinc-800"}`}
          >
            Under review
          </span>
        </div>
        <div className="flex w-5 shrink-0 flex-col pt-1" aria-hidden>
          <div className={`mt-1 h-0.5 w-full rounded-full ${line23}`} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot3}`} aria-hidden />
          <span className={`text-[11px] leading-snug ${label3Class}`}>{label3}</span>
          {showConfirmed ? (
            <p className="max-w-[9.5rem] text-[10px] leading-snug text-emerald-800">
              <span className="font-medium">Confirmed:</span> {formatSlot(selectedSlot)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function MyRequestsPage() {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState<InterviewRequestRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("interview_requests")
      .select(
        "id, resource_id, company_name, message, proposed_slot_1, proposed_slot_2, proposed_slot_3, selected_slot, status, created_at",
      )
      .ilike("requester_email", trimmed)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setResults(null);
      setLoading(false);
      return;
    }

    const baseRows: Omit<InterviewRequestRow, "consultant_name">[] = (data ?? []).map((r) => ({
      id: r.id as string,
      resource_id: r.resource_id as string,
      company_name: r.company_name as string,
      message: (r.message as string | null) ?? null,
      proposed_slot_1: (r.proposed_slot_1 as string | null) ?? null,
      proposed_slot_2: (r.proposed_slot_2 as string | null) ?? null,
      proposed_slot_3: (r.proposed_slot_3 as string | null) ?? null,
      selected_slot: (r.selected_slot as string | null) ?? null,
      status: (r.status as string) ?? "requested",
      created_at: (r.created_at as string) ?? "",
    }));

    const uniqueResourceIds = [...new Set(baseRows.map((r) => r.resource_id))];
    const nameByResourceId: Record<string, string> = {};

    if (uniqueResourceIds.length > 0) {
      const { data: resourceRows } = await supabase
        .from("resources")
        .select("id, name")
        .in("id", uniqueResourceIds);

      for (const row of resourceRows ?? []) {
        const id = row.id as string;
        const name = row.name as string | null;
        if (name != null && name.trim() !== "") {
          nameByResourceId[id] = name.trim();
        }
      }
    }

    setResults(
      baseRows.map((r) => ({
        ...r,
        consultant_name: nameByResourceId[r.resource_id] ?? null,
      })),
    );
    setLoading(false);
  }

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
            My interview requests
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Enter the email you used when submitting requests to see their status.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 md:flex-row md:items-end md:gap-4 md:p-6"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800">Work email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Loading…" : "View my requests"}
          </button>
        </form>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {results !== null && !error && results.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            No requests found for this email.
          </p>
        ) : null}

        {results !== null && results.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {results.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/5 md:p-6"
              >
                <div className="flex flex-col gap-2 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-zinc-950">{row.company_name}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      Consultant:{" "}
                      {row.consultant_name != null && row.consultant_name.trim() !== ""
                        ? row.consultant_name
                        : "Consultant"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                </div>

                <RequestStatusTimeline status={row.status} selectedSlot={row.selected_slot} />

                <div className="mt-4">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Message</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                    {row.message?.trim() ? row.message : "—"}
                  </p>
                </div>

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
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </>
  );
}
