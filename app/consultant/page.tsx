"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type InterviewRequestRow = {
  id: string;
  resource_id: string;
  company_name: string;
  requester_name: string;
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
    <div className="mt-1 space-y-0.5 text-xs text-white/45">
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
    return "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/35";
  }
  if (s === "declined") {
    return "bg-red-500/20 text-red-200 ring-1 ring-red-500/35";
  }
  return "bg-white/10 text-white/75 ring-1 ring-white/15";
}

function filterPillClass(active: boolean) {
  if (active) {
    return "rounded-full border border-[#ff6a00] bg-[#ff6a00] px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-black/30";
  }
  return "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/65 transition hover:border-white/20 hover:bg-white/[0.08]";
}

function kindTabClass(active: boolean) {
  if (active) {
    return "rounded-full border border-[#ff6a00] bg-[#ff6a00] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-black/30";
  }
  return "rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white/65 transition hover:border-white/20 hover:bg-white/[0.08]";
}

function profileLabel(name: string | null) {
  return name != null && name.trim() !== "" ? name.trim() : "Your talent profile";
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

export default function ConsultantDashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [interviewRows, setInterviewRows] = useState<InterviewRequestRow[] | null>(null);
  const [proposalRows, setProposalRows] = useState<EngagementProposalRow[] | null>(null);
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  const [noProfileForEmail, setNoProfileForEmail] = useState(false);
  const [hasUnclaimedProfile, setHasUnclaimedProfile] = useState(false);
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
    setNoProfileForEmail(false);
    setHasUnclaimedProfile(false);
    setInterviewFilter("all");
    setKindTab("all");

    const { data: resourceRows, error: resourcesError } = await supabase
      .from("resources")
      .select("id, name, claimed, available_from")
      .ilike("contact_email", trimmed);

    if (resourcesError) {
      setError(resourcesError.message);
      setInterviewRows(null);
      setProposalRows(null);
      setDashboardEmail(null);
      setHasUnclaimedProfile(false);
      setLoading(false);
      return;
    }

    const resources = resourceRows ?? [];
    if (resources.length === 0) {
      setInterviewRows([]);
      setProposalRows([]);
      setDashboardEmail(trimmed);
      setNoProfileForEmail(true);
      setHasUnclaimedProfile(false);
      setLoading(false);
      return;
    }

    setHasUnclaimedProfile(
      resources.some((r) => {
        const c = (r as { claimed?: boolean | null }).claimed;
        return c !== true;
      }),
    );

    const nameByResourceId: Record<string, string> = {};
    const availableFromByResourceId: Record<string, string | null> = {};
    const nextBlockedByResourceId: Record<string, string | null> = {};
    const resourceIds: string[] = [];
    for (const row of resources) {
      const id = row.id as string;
      resourceIds.push(id);
      const name = row.name as string | null;
      if (name != null && name.trim() !== "") {
        nameByResourceId[id] = name.trim();
      }
      const af = row.available_from as string | null | undefined;
      availableFromByResourceId[id] =
        af != null && String(af).trim() !== "" ? String(af).slice(0, 10) : null;
    }

    let blockedDateRows: { resource_id: string; blocked_date: string }[] = [];
    if (resourceIds.length > 0) {
      const { data: blockedData, error: blockedError } = await supabase
        .from("resource_blocked_dates")
        .select("resource_id, blocked_date")
        .in("resource_id", resourceIds);

      if (!blockedError && blockedData != null) {
        blockedDateRows = blockedData.map((b) => ({
          resource_id: b.resource_id as string,
          blocked_date: String(b.blocked_date).slice(0, 10),
        }));
      }
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
    for (const id of resourceIds) {
      const upcoming = upcomingBlockedByResource.get(id);
      nextBlockedByResourceId[id] = upcoming != null && upcoming.length > 0 ? upcoming[0] : null;
    }

    const [irRes, epRes] = await Promise.all([
      supabase
        .from("interview_requests")
        .select(
          "id, resource_id, company_name, requester_name, message, proposed_slot_1, proposed_slot_2, proposed_slot_3, selected_slot, status, created_at",
        )
        .in("resource_id", resourceIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("engagement_proposals")
        .select(
          "id, resource_id, company_name, requester_name, proposed_start_date, proposed_end_date, scope, proposed_rate, status, created_at",
        )
        .in("resource_id", resourceIds)
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
      requester_name: (r.requester_name as string) ?? "",
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
      requester_name: (r.requester_name as string) ?? "",
      proposed_start_date: (r.proposed_start_date as string | null) ?? null,
      proposed_end_date: (r.proposed_end_date as string | null) ?? null,
      scope: (r.scope as string | null) ?? null,
      proposed_rate: (r.proposed_rate as number | null) ?? null,
      status: (r.status as string) ?? "proposed",
      created_at: (r.created_at as string) ?? "",
    }));

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
    setNoProfileForEmail(false);
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
        setError("Your account has no email address. Add an email to your Procal login to view your talent dashboard.");
        setInterviewRows([]);
        setProposalRows([]);
        setDashboardEmail(null);
        setNoProfileForEmail(false);
        setHasUnclaimedProfile(false);
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
  const bothEmpty = hasLoaded && !noProfileForEmail && totalInterviews === 0 && totalProposals === 0;

  return (
    <>
      <AppTopNav variant="hero" />
      <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -top-32 left-1/2 h-[min(55vh,28rem)] w-[min(140%,48rem)] -translate-x-1/2 rounded-full opacity-90 blur-3xl"
            style={{
              background: "radial-gradient(closest-side, rgba(255,106,0,0.14), transparent 72%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black" />
        </div>
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 md:gap-8 md:px-10 md:pb-20 md:pt-8">
          <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/25 backdrop-blur-md md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ff6a00] md:text-[11px]">
              Talent dashboard
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Manage your opportunities</h1>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Track interview requests, engagement proposals, and your profile visibility.
                </p>
                {dashboardEmail != null ? (
                  <p className="mt-3 text-xs text-white/45">Showing talent profile for {dashboardEmail}</p>
                ) : null}
              </div>
              <div className="grid w-full gap-2 sm:w-auto sm:min-w-[15rem]">
                <Link
                  href="/consultant/edit"
                  className="inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#ff6a00]/45 hover:bg-white/[0.08]"
                >
                  Edit profile
                  <span className="text-white/40">→</span>
                </Link>
                <Link
                  href="/consultant/availability"
                  className="inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#ff6a00]/45 hover:bg-white/[0.08]"
                >
                  Manage availability
                  <span className="text-white/40">→</span>
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#ff6a00]/45 hover:bg-white/[0.08]"
                >
                  View marketplace
                  <span className="text-white/40">→</span>
                </Link>
              </div>
            </div>
          </header>

        {loading ? (
          <p className="text-sm text-white/50">Loading your dashboard…</p>
        ) : null}

        {hasLoaded && !noProfileForEmail && hasUnclaimedProfile ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/25 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <p className="text-sm font-medium text-amber-100">
              Claim your profile to manage your information
            </p>
            <Link
              href="/consultant/claim"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#ff6a00] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
            >
              Claim profile
            </Link>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">{error}</p>
        ) : null}

        {hasLoaded && noProfileForEmail ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            No talent profile found for this email.
          </p>
        ) : null}

        {hasLoaded && !noProfileForEmail && !error && bothEmpty ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/65">
            <p>No interview requests or engagement proposals yet for your profile(s).</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/consultant/edit" className="text-[#ff6a00] hover:underline">
                Edit profile
              </Link>
              <span className="text-white/30">•</span>
              <Link href="/consultant/availability" className="text-[#ff6a00] hover:underline">
                Manage availability
              </Link>
            </div>
          </div>
        ) : null}

        {hasLoaded && !noProfileForEmail && !error && !bothEmpty ? (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Total interview requests</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                  {interviewCounts?.total ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-[#ff6a00]/30 bg-[#ff6a00]/10 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
                <p className="text-xs font-medium uppercase tracking-wide text-white/60">Accepted interviews</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[#ffb37a]">
                  {interviewCounts?.accepted ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Total proposals</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                  {proposalCounts?.total ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-[#ff6a00]/30 bg-[#ff6a00]/10 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
                <p className="text-xs font-medium uppercase tracking-wide text-white/60">Accepted proposals</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[#ffb37a]">
                  {proposalCounts?.accepted ?? 0}
                </p>
              </div>
            </section>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-white/50">View</p>
              <div
                className="inline-flex w-fit flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1"
                role="tablist"
                aria-label="Content type"
              >
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
                  <h2 className="text-sm font-semibold text-white">Interview requests</h2>
                  <div
                    className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1"
                    role="tablist"
                    aria-label="Filter interviews by status"
                  >
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
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/65">
                    No interview requests yet.
                  </p>
                ) : filteredInterviews.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/65">
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
                          className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur-md md:p-6"
                        >
                          <p className="text-xs text-white/45">
                            <span className="font-medium text-white/60">Talent:</span>{" "}
                            {profileLabel(row.consultant_name)}
                          </p>
                          <ConsultantAvailabilityContext
                            availableFrom={row.available_from}
                            nextBlocked={row.next_blocked_date}
                          />
                          <div className="mt-2 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-base font-semibold tracking-tight text-white">{row.company_name}</p>
                              <p className="mt-1 text-sm text-white/60">
                                <span className="font-medium text-white/75">Contact:</span>{" "}
                                {row.requester_name.trim() || "—"}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses(row.status)}`}
                              >
                                {row.status}
                              </span>
                              <span className="text-xs text-white/45">
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
                            <h3 className="text-xs font-medium uppercase tracking-wide text-white/45">Message</h3>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                              {row.message?.trim() ? row.message : "—"}
                            </p>
                          </div>

                          <div className="mt-4">
                            <h3 className="text-xs font-medium uppercase tracking-wide text-white/45">Proposed slots</h3>
                            <div className="mt-2 grid gap-2 text-sm text-white/85 sm:grid-cols-3">
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                                <span className="text-xs text-white/45">Slot 1</span>
                                <p className="font-medium">{formatSlot(row.proposed_slot_1)}</p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                                <span className="text-xs text-white/45">Slot 2</span>
                                <p className="font-medium">{formatSlot(row.proposed_slot_2)}</p>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                                <span className="text-xs text-white/45">Slot 3</span>
                                <p className="font-medium">{formatSlot(row.proposed_slot_3)}</p>
                              </div>
                            </div>
                          </div>

                          {accepted ? (
                            <p className="mt-4 text-sm font-medium text-[#ffb37a]">
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
                <h2 className="text-sm font-semibold text-white">Engagement proposals</h2>

                {totalProposals === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/65">
                    No engagement proposals yet.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {(proposalRows ?? []).map((row) => (
                      <li
                        key={row.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur-md md:p-6"
                      >
                        <p className="text-xs text-white/45">
                          <span className="font-medium text-white/60">Talent:</span>{" "}
                          {profileLabel(row.consultant_name)}
                        </p>
                        <ConsultantAvailabilityContext
                          availableFrom={row.available_from}
                          nextBlocked={row.next_blocked_date}
                        />
                        <div className="mt-2 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold tracking-tight text-white">{row.company_name}</p>
                            <p className="mt-1 text-sm text-white/60">
                              <span className="font-medium text-white/75">Requester:</span>{" "}
                              {row.requester_name.trim() || "—"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses(row.status)}`}
                            >
                              {row.status}
                            </span>
                            <span className="text-xs text-white/45">
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
                            <dt className="text-xs font-medium uppercase tracking-wide text-white/45">Start</dt>
                            <dd className="mt-1 font-medium text-white/80">{formatProposalDate(row.proposed_start_date)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-white/45">End</dt>
                            <dd className="mt-1 font-medium text-white/80">{formatProposalDate(row.proposed_end_date)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-white/45">Proposed rate</dt>
                            <dd className="mt-1 font-medium text-white/80">{formatRateZar(row.proposed_rate)}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 border-t border-white/10 pt-4">
                          <h3 className="text-xs font-medium uppercase tracking-wide text-white/45">Scope</h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
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
      </div>
    </>
  );
}
