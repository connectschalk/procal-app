"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  /** ISO YYYY-MM-DD or null */
  available_from: string | null;
  /** Earliest blocked_date >= today, ISO YYYY-MM-DD or null */
  next_blocked_date: string | null;
};

type EngagementProposalRow = {
  id: string;
  resource_id: string;
  company_name: string;
  requester_name: string;
  status: string;
  created_at: string;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  scope: string | null;
  proposed_rate: number | null;
  consultant_name: string | null;
  /** ISO YYYY-MM-DD or null */
  available_from: string | null;
  /** Earliest blocked_date >= today, ISO YYYY-MM-DD or null */
  next_blocked_date: string | null;
};

type InterviewStatusFilter = "all" | "requested" | "accepted" | "declined";
type KindTab = "all" | "interviews" | "proposals";

function formatSlot(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatProposalDate(value: string | null) {
  if (value == null || String(value).trim() === "") return "—";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d);
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatCardDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d);
}

function ConsultantAvailabilityContext({
  availableFrom,
  nextBlocked,
}: {
  availableFrom: string | null;
  nextBlocked: string | null;
}) {
  const fromIso = availableFrom != null && availableFrom.trim() !== "" ? availableFrom.trim() : null;
  const blockedIso = nextBlocked != null && nextBlocked.trim() !== "" ? nextBlocked.trim() : null;
  return (
    <div className="mt-1 space-y-0.5 text-xs text-zinc-500">
      {fromIso != null ? <p>Available from {formatCardDate(fromIso)}</p> : <p>Available now</p>}
      {blockedIso != null ? <p>Next unavailable: {formatCardDate(blockedIso)}</p> : null}
    </div>
  );
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

function filterPillClass(active: boolean) {
  if (active) {
    return "rounded-full border border-orange-500 bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-orange-950/10";
  }
  return "rounded-full border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-orange-200 hover:bg-orange-50/50";
}

function kindTabClass(active: boolean) {
  if (active) {
    return "rounded-full border border-zinc-900 bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-zinc-950/10";
  }
  return "rounded-full border border-zinc-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50/80";
}

function consultantLabelInterview(row: InterviewRequestRow) {
  return row.consultant_name != null && row.consultant_name.trim() !== "" ? row.consultant_name : "Consultant";
}

function consultantLabelProposal(row: EngagementProposalRow) {
  return row.consultant_name != null && row.consultant_name.trim() !== "" ? row.consultant_name : "Consultant";
}

function summarizeInterviews(rows: InterviewRequestRow[]) {
  let accepted = 0;
  for (const r of rows) {
    if (r.status.toLowerCase() === "accepted") accepted += 1;
  }
  return { total: rows.length, accepted };
}

function summarizeProposals(rows: EngagementProposalRow[]) {
  let accepted = 0;
  for (const r of rows) {
    if (r.status.toLowerCase() === "accepted") accepted += 1;
  }
  return { total: rows.length, accepted };
}

export default function CompanyDashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [interviewRows, setInterviewRows] = useState<InterviewRequestRow[] | null>(null);
  const [proposalRows, setProposalRows] = useState<EngagementProposalRow[] | null>(null);
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interviewFilter, setInterviewFilter] = useState<InterviewStatusFilter>("all");
  const [kindTab, setKindTab] = useState<KindTab>("all");

  const interviewCounts = useMemo(
    () => (interviewRows != null ? summarizeInterviews(interviewRows) : null),
    [interviewRows],
  );
  const proposalCounts = useMemo(
    () => (proposalRows != null ? summarizeProposals(proposalRows) : null),
    [proposalRows],
  );

  const filteredInterviews = useMemo(() => {
    if (interviewRows == null) return [];
    if (interviewFilter === "all") return interviewRows;
    return interviewRows.filter((r) => r.status.toLowerCase() === interviewFilter);
  }, [interviewRows, interviewFilter]);

  const showInterviews = kindTab === "all" || kindTab === "interviews";
  const showProposals = kindTab === "all" || kindTab === "proposals";

  const loadDashboard = useCallback(async (trimmed: string) => {
    setDashboardEmail(trimmed);
    setLoading(true);
    setError(null);
    setInterviewFilter("all");
    setKindTab("all");

    const [irRes, epRes] = await Promise.all([
      supabase
        .from("interview_requests")
        .select(
          "id, resource_id, company_name, message, proposed_slot_1, proposed_slot_2, proposed_slot_3, selected_slot, status, created_at",
        )
        .ilike("requester_email", trimmed)
        .order("created_at", { ascending: false }),
      supabase
        .from("engagement_proposals")
        .select(
          "id, resource_id, company_name, requester_name, proposed_start_date, proposed_end_date, scope, proposed_rate, status, created_at",
        )
        .ilike("requester_email", trimmed)
        .order("created_at", { ascending: false }),
    ]);

    const errParts: string[] = [];
    if (irRes.error) {
      errParts.push(`Interview requests: ${irRes.error.message}`);
    }
    if (epRes.error) {
      errParts.push(`Engagement proposals: ${epRes.error.message}`);
    }

    if (irRes.error && epRes.error) {
      setError(errParts.join(" "));
      setInterviewRows(null);
      setProposalRows(null);
      setDashboardEmail(null);
      setLoading(false);
      return;
    }

    if (errParts.length > 0) {
      setError(errParts.join(" "));
    } else {
      setError(null);
    }

    type InterviewRequestBase = Omit<
      InterviewRequestRow,
      "consultant_name" | "available_from" | "next_blocked_date"
    >;
    const baseInterviews: InterviewRequestBase[] = (irRes.data ?? []).map((r) => ({
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

    type EngagementProposalBase = Omit<
      EngagementProposalRow,
      "consultant_name" | "available_from" | "next_blocked_date"
    >;
    const baseProposals: EngagementProposalBase[] = (epRes.data ?? []).map((r) => ({
      id: r.id as string,
      resource_id: r.resource_id as string,
      company_name: r.company_name as string,
      requester_name: r.requester_name as string,
      proposed_start_date: (r.proposed_start_date as string | null) ?? null,
      proposed_end_date: (r.proposed_end_date as string | null) ?? null,
      scope: (r.scope as string | null) ?? null,
      proposed_rate: (r.proposed_rate as number | null) ?? null,
      status: (r.status as string) ?? "proposed",
      created_at: (r.created_at as string) ?? "",
    }));

    const uniqueResourceIds = [
      ...new Set([...baseInterviews.map((r) => r.resource_id), ...baseProposals.map((r) => r.resource_id)]),
    ];
    const nameByResourceId: Record<string, string> = {};
    const availableFromByResourceId: Record<string, string | null> = {};
    const nextBlockedByResourceId: Record<string, string | null> = {};

    if (uniqueResourceIds.length > 0) {
      const { data: resourceRows } = await supabase
        .from("resources")
        .select("id, name, available_from")
        .in("id", uniqueResourceIds);

      for (const row of resourceRows ?? []) {
        const id = row.id as string;
        const name = row.name as string | null;
        if (name != null && name.trim() !== "") {
          nameByResourceId[id] = name.trim();
        }
        const af = row.available_from as string | null | undefined;
        availableFromByResourceId[id] =
          af != null && String(af).trim() !== "" ? String(af).slice(0, 10) : null;
      }

      let blockedDateRows: { resource_id: string; blocked_date: string }[] = [];
      const { data: blockedData, error: blockedError } = await supabase
        .from("resource_blocked_dates")
        .select("resource_id, blocked_date")
        .in("resource_id", uniqueResourceIds);

      if (!blockedError && blockedData != null) {
        blockedDateRows = blockedData.map((b) => ({
          resource_id: b.resource_id as string,
          blocked_date: String(b.blocked_date).slice(0, 10),
        }));
      }

      const today = localIsoDate(new Date());
      const upcomingBlockedByResource = new Map<string, string[]>();
      for (const b of blockedDateRows) {
        if (b.blocked_date < today) continue;
        const list = upcomingBlockedByResource.get(b.resource_id);
        if (list == null) {
          upcomingBlockedByResource.set(b.resource_id, [b.blocked_date]);
        } else {
          list.push(b.blocked_date);
        }
      }
      for (const list of upcomingBlockedByResource.values()) {
        list.sort((a, c) => a.localeCompare(c));
      }

      for (const id of uniqueResourceIds) {
        const upcoming = upcomingBlockedByResource.get(id);
        nextBlockedByResourceId[id] =
          upcoming != null && upcoming.length > 0 ? upcoming[0] : null;
      }
    }

    setInterviewRows(
      irRes.error
        ? []
        : baseInterviews.map((r) => ({
            ...r,
            consultant_name: nameByResourceId[r.resource_id] ?? null,
            available_from: availableFromByResourceId[r.resource_id] ?? null,
            next_blocked_date: nextBlockedByResourceId[r.resource_id] ?? null,
          })),
    );
    setProposalRows(
      epRes.error
        ? []
        : baseProposals.map((r) => ({
            ...r,
            consultant_name: nameByResourceId[r.resource_id] ?? null,
            available_from: availableFromByResourceId[r.resource_id] ?? null,
            next_blocked_date: nextBlockedByResourceId[r.resource_id] ?? null,
          })),
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      const trimmed = user?.email?.trim();
      if (!trimmed) {
        setError("Your account has no email address. Add an email to your Procal login to view company activity.");
        setInterviewRows([]);
        setProposalRows([]);
        setDashboardEmail(null);
        setLoading(false);
        return;
      }
      await loadDashboard(trimmed);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, loadDashboard]);

  const hasLoaded = interviewRows !== null && proposalRows !== null;
  const totalInterviews = interviewRows?.length ?? 0;
  const totalProposals = proposalRows?.length ?? 0;
  const bothEmpty = hasLoaded && totalInterviews === 0 && totalProposals === 0;

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">Company Dashboard</h1>
              <p className="text-sm leading-relaxed text-zinc-600">
                Track your interview requests and engagement proposals in one place.
              </p>
            </div>
          </div>
          {dashboardEmail != null ? (
            <p className="text-xs text-zinc-500">Showing activity for {dashboardEmail}</p>
          ) : null}
        </header>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading your dashboard…</p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {hasLoaded && !error && bothEmpty ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            No interview requests or engagement proposals found for this email.
          </p>
        ) : null}

        {hasLoaded && !error && !bothEmpty ? (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total interviews</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">
                  {interviewCounts?.total ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Accepted interviews</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-800">
                  {interviewCounts?.accepted ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total proposals</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">
                  {proposalCounts?.total ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/[0.03]">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Accepted proposals</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-800">
                  {proposalCounts?.accepted ?? 0}
                </p>
              </div>
            </section>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">View</p>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Content type">
                {(["all", "interviews", "proposals"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={kindTab === k}
                    onClick={() => setKindTab(k)}
                    className={kindTabClass(kindTab === k)}
                  >
                    {k === "all" ? "All" : k === "interviews" ? "Interviews" : "Proposals"}
                  </button>
                ))}
              </div>
            </div>

            {showInterviews ? (
              <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Interview requests</h2>
                  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter interviews by status">
                    {(["all", "requested", "accepted", "declined"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        role="tab"
                        aria-selected={interviewFilter === f}
                        onClick={() => setInterviewFilter(f)}
                        className={filterPillClass(interviewFilter === f)}
                      >
                        {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {totalInterviews === 0 ? (
                  <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    No interview requests yet.
                  </p>
                ) : filteredInterviews.length === 0 ? (
                  <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    No interview requests match this filter.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {filteredInterviews.map((row) => {
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
                            <span className="font-medium text-zinc-800">Consultant:</span>{" "}
                            {consultantLabelInterview(row)}
                          </p>
                          <ConsultantAvailabilityContext
                            availableFrom={row.available_from}
                            nextBlocked={row.next_blocked_date}
                          />
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
                )}
              </section>
            ) : null}

            {showProposals ? (
              <section className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-zinc-900">Engagement proposals</h2>

                {totalProposals === 0 ? (
                  <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    No engagement proposals yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {(proposalRows ?? []).map((row) => (
                      <li
                        key={row.id}
                        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/5 md:p-6"
                      >
                        <p className="text-sm text-zinc-600">
                          <span className="font-medium text-zinc-800">Consultant:</span>{" "}
                          {consultantLabelProposal(row)}
                        </p>
                        <ConsultantAvailabilityContext
                          availableFrom={row.available_from}
                          nextBlocked={row.next_blocked_date}
                        />
                        <div className="mt-2 flex flex-col gap-2 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold tracking-tight text-zinc-950">{row.company_name}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              <span className="font-medium text-zinc-600">Contact:</span> {row.requester_name}
                            </p>
                          </div>
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

                        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Start</dt>
                            <dd className="mt-1 font-medium text-zinc-800">{formatProposalDate(row.proposed_start_date)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">End</dt>
                            <dd className="mt-1 font-medium text-zinc-800">{formatProposalDate(row.proposed_end_date)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Proposed rate</dt>
                            <dd className="mt-1 font-medium text-zinc-800">{formatRateZar(row.proposed_rate)}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 border-t border-zinc-100 pt-4">
                          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Scope</h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                            {row.scope?.trim() ? row.scope : "—"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}
