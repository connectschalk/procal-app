"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

const STORAGE_KEY = "procal.companyEmail";

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

type StatusFilter = "all" | "requested" | "accepted" | "declined";

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

function filterPillClass(active: boolean) {
  if (active) {
    return "rounded-full border border-orange-500 bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-orange-950/10";
  }
  return "rounded-full border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-orange-200 hover:bg-orange-50/50";
}

function consultantLabel(row: InterviewRequestRow) {
  return row.consultant_name != null && row.consultant_name.trim() !== "" ? row.consultant_name : "Consultant";
}

function summarize(rows: InterviewRequestRow[]) {
  let requested = 0;
  let accepted = 0;
  let declined = 0;
  for (const r of rows) {
    const s = r.status.toLowerCase();
    if (s === "requested") requested += 1;
    else if (s === "accepted") accepted += 1;
    else if (s === "declined") declined += 1;
  }
  return { total: rows.length, requested, accepted, declined };
}

export default function CompanyDashboardPage() {
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<InterviewRequestRow[] | null>(null);
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => (rows != null ? summarize(rows) : null), [rows]);

  const filteredRows = useMemo(() => {
    if (rows == null) return [];
    if (filter === "all") return rows;
    return rows.filter((r) => r.status.toLowerCase() === filter);
  }, [rows, filter]);

  const loadDashboard = useCallback(async (trimmed: string) => {
    setEmail(trimmed);
    setLoading(true);
    setError(null);
    setFilter("all");

    const { data, error: fetchError } = await supabase
      .from("interview_requests")
      .select(
        "id, resource_id, company_name, message, proposed_slot_1, proposed_slot_2, proposed_slot_3, selected_slot, status, created_at",
      )
      .ilike("requester_email", trimmed)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setRows(null);
      setDashboardEmail(null);
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

    setRows(
      baseRows.map((r) => ({
        ...r,
        consultant_name: nameByResourceId[r.resource_id] ?? null,
      })),
    );
    setDashboardEmail(trimmed);
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const trimmed = stored?.trim();
      if (trimmed) {
        queueMicrotask(() => {
          void loadDashboard(trimmed);
        });
      }
    } catch {
      /* ignore */
    }
  }, [loadDashboard]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }

    await loadDashboard(trimmed);
  }

  function handleChangeEmail() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setEmail("");
    setRows(null);
    setDashboardEmail(null);
    setError(null);
    setFilter("all");
  }

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">Company Dashboard</h1>
              <p className="text-sm leading-relaxed text-zinc-600">
                Track your interview requests and confirmed meetings.
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
            <p className="text-xs text-zinc-500">Showing requests for: {dashboardEmail}</p>
          ) : null}
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
            {loading ? "Loading…" : "Load dashboard"}
          </button>
        </form>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {rows !== null && !error && rows.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            No interview requests found for this email.
          </p>
        ) : null}

        {rows !== null && !error ? (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total requests</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">{counts?.total ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Requested</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">{counts?.requested ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Accepted</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-800">{counts?.accepted ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Declined</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-red-800">{counts?.declined ?? 0}</p>
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Your requests</h2>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
                {(["all", "requested", "accepted", "declined"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={filterPillClass(filter === f)}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filteredRows.length === 0 && rows.length > 0 ? (
              <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                No requests match this filter.
              </p>
            ) : null}

            {filteredRows.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {filteredRows.map((row) => {
                  const accepted =
                    row.status.toLowerCase() === "accepted" &&
                    row.selected_slot != null &&
                    String(row.selected_slot).trim() !== "";
                  return (
                    <li
                      key={row.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/5 md:p-6"
                    >
                      <p className="text-sm text-zinc-600">
                        <span className="font-medium text-zinc-800">Consultant:</span> {consultantLabel(row)}
                      </p>
                      <div className="mt-2 flex flex-col gap-2 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-base font-semibold tracking-tight text-zinc-950">{row.company_name}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses(row.status)}`}
                          >
                            {row.status}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Submitted{" "}
                            {row.created_at
                              ? new Intl.DateTimeFormat("en-ZA", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(new Date(row.created_at))
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Message</h3>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                          {row.message?.trim() ? row.message : "—"}
                        </p>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Proposed slots</h3>
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

                      {accepted ? (
                        <p className="mt-4 text-sm font-medium text-emerald-900">
                          Confirmed time: {formatSlot(row.selected_slot)}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}
