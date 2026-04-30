"use client";

import Link from "next/link";
import Image from "next/image";
import { AppTopNav } from "@/components/app-top-nav";
import { createInterviewIcs } from "@/lib/calendar-invite";
import { isCompanyProfileComplete } from "@/lib/company-profile";
import { getPublicTalentAvatarDisplay } from "@/lib/talent-avatar-library";
import { WelcomeToProcalModal } from "@/components/welcome-to-procal-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type InterviewRequestRow = {
  id: string;
  resource_id: string;
  company_name: string;
  requester_name: string;
  requester_email: string;
  message: string | null;
  proposed_slot_1: string | null;
  proposed_slot_2: string | null;
  proposed_slot_3: string | null;
  selected_slot: string | null;
  decline_message: string | null;
  alternative_slots: string[] | null;
  reschedule_message: string | null;
  reschedule_slots: string[] | null;
  status: string;
  created_at: string;
  consultant_name: string | null;
  consultant_headline: string | null;
  consultant_bio: string | null;
  consultant_hourly_rate: number | null;
  consultant_location: string | null;
  consultant_avatar_key: string | null;
  consultant_cv_path: string | null;
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
  requester_email: string;
  status: string;
  created_at: string;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  scope: string | null;
  proposed_rate: number | null;
  consultant_name: string | null;
  consultant_headline: string | null;
  consultant_hourly_rate: number | null;
  consultant_location: string | null;
  consultant_avatar_key: string | null;
  /** ISO YYYY-MM-DD or null */
  available_from: string | null;
  /** Earliest blocked_date >= today, ISO YYYY-MM-DD or null */
  next_blocked_date: string | null;
};

type InterviewStatusFilter = "all" | "requested" | "accepted" | "declined";
type KindTab = "all" | "interviews" | "proposals";
type ActiveSection = "profile" | "interests" | "hiring" | "engagements";

type CompanyProfile = {
  company_name: string;
  logo_path: string;
  contact_person: string;
  contact_email: string;
  contact_number: string;
  website: string;
  location: string;
  description: string;
  talent_interests: string[];
};

type CompanyProfileInlineErrors = Partial<
  Record<"company_name" | "contact_person" | "contact_email", string>
>;

function mapApiProfileToState(p: Partial<CompanyProfile> | null | undefined): CompanyProfile {
  return {
    company_name: typeof p?.company_name === "string" ? p.company_name : "",
    logo_path: typeof p?.logo_path === "string" ? p.logo_path : "",
    contact_person: typeof p?.contact_person === "string" ? p.contact_person : "",
    contact_email: typeof p?.contact_email === "string" ? p.contact_email : "",
    contact_number: typeof p?.contact_number === "string" ? p.contact_number : "",
    website: typeof p?.website === "string" ? p.website : "",
    location: typeof p?.location === "string" ? p.location : "",
    description: typeof p?.description === "string" ? p.description : "",
    talent_interests: Array.isArray(p?.talent_interests)
      ? p.talent_interests.filter((v): v is string => typeof v === "string")
      : [],
  };
}

type RequirementRow = {
  id: string;
  title: string;
  role_type: string | null;
  job_spec: string | null;
  rate_min: number | null;
  rate_max: number | null;
  start_date: string | null;
  location: string | null;
  status: string | null;
  created_at: string;
};

type RequirementForm = {
  title: string;
  role_type: string;
  job_spec: string;
  rate_min: string;
  rate_max: string;
  start_date: string;
  location: string;
};

const INTEREST_OPTIONS = [
  "Business Analyst",
  "Solution Architect",
  "Enterprise Architect",
  "Programme Manager",
  "Project Manager",
  "Change Manager",
  "Scrum Master",
  "Product Owner",
  "Data Analyst",
  "SAP Consultant",
  "Integration Specialist",
  "Developer",
  "QA / Tester",
  "Business Process Analyst",
] as const;

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

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function buildMonthGrid(monthStart: Date): Date[] {
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
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
    return "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40";
  }
  if (s === "declined_with_alternatives" || s === "reschedule_requested") {
    return "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40";
  }
  if (s === "cancelled") {
    return "bg-red-500/20 text-red-200 ring-1 ring-red-400/40";
  }
  if (s === "declined") {
    return "bg-red-500/20 text-red-200 ring-1 ring-red-400/40";
  }
  return "bg-zinc-500/20 text-zinc-200 ring-1 ring-zinc-400/40";
}

function statusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === "declined_with_alternatives") return "Alternatives proposed";
  if (s === "reschedule_requested") return "Reschedule requested";
  return status;
}

function filterPillClass(active: boolean) {
  if (active) {
    return "rounded-full border border-orange-500/90 bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white";
  }
  return "rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-orange-400/50 hover:text-zinc-100";
}

function kindTabClass(active: boolean) {
  if (active) {
    return "rounded-full border border-orange-500/90 bg-orange-500 px-3.5 py-1.5 text-xs font-semibold text-white";
  }
  return "rounded-full border border-zinc-700 bg-zinc-900/70 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100";
}

function consultantLabelInterview(row: InterviewRequestRow) {
  return row.consultant_name != null && row.consultant_name.trim() !== "" ? row.consultant_name : "Consultant";
}

function consultantLabelProposal(row: EngagementProposalRow) {
  return row.consultant_name != null && row.consultant_name.trim() !== "" ? row.consultant_name : "Consultant";
}

function consultantProfileHref(resourceId: string) {
  return `/consultants/${resourceId}`;
}

export default function CompanyDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const initialSection: ActiveSection =
    requestedSection === "profile" ||
    requestedSection === "interests" ||
    requestedSection === "hiring" ||
    requestedSection === "engagements"
      ? requestedSection
      : "engagements";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [interviewRows, setInterviewRows] = useState<InterviewRequestRow[] | null>(null);
  const [proposalRows, setProposalRows] = useState<EngagementProposalRow[] | null>(null);
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interviewFilter, setInterviewFilter] = useState<InterviewStatusFilter>("all");
  const [kindTab, setKindTab] = useState<KindTab>("all");
  const [activeSection, setActiveSection] = useState<ActiveSection>(initialSection);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasCompanyProfile, setHasCompanyProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileInlineErrors, setProfileInlineErrors] = useState<CompanyProfileInlineErrors>({});
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile>({
    company_name: "",
    logo_path: "",
    contact_person: "",
    contact_email: "",
    contact_number: "",
    website: "",
    location: "",
    description: "",
    talent_interests: [],
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreviewUrl, setPendingLogoPreviewUrl] = useState<string | null>(null);
  const pendingLogoObjectUrlRef = useRef<string | null>(null);
  const [requirementsLoading, setRequirementsLoading] = useState(true);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [bookingNoticeByInterviewId, setBookingNoticeByInterviewId] = useState<Record<string, string>>({});
  const [cvBusyByInterviewId, setCvBusyByInterviewId] = useState<Record<string, boolean>>({});
  const [availabilityModalRow, setAvailabilityModalRow] = useState<InterviewRequestRow | null>(null);
  const [blockedDatesByResourceId, setBlockedDatesByResourceId] = useState<Record<string, string[]>>({});
  const [availabilityModalMonth, setAvailabilityModalMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [rescheduleModalRow, setRescheduleModalRow] = useState<InterviewRequestRow | null>(null);
  const [rescheduleSlotsDraft, setRescheduleSlotsDraft] = useState<[string, string, string]>(["", "", ""]);
  const [rescheduleMessageDraft, setRescheduleMessageDraft] = useState("");
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [requirementSaving, setRequirementSaving] = useState(false);
  const [requirementForm, setRequirementForm] = useState<RequirementForm>({
    title: "",
    role_type: "",
    job_spec: "",
    rate_min: "",
    rate_max: "",
    start_date: "",
    location: "",
  });

  const filteredInterviews = useMemo(() => {
    if (interviewRows == null) return [];
    if (interviewFilter === "all") return interviewRows;
    return interviewRows.filter((r) => {
      const s = r.status.toLowerCase();
      if (interviewFilter === "requested") return s === "requested" || s === "reschedule_requested";
      if (interviewFilter === "declined") return s === "declined" || s === "declined_with_alternatives";
      return s === interviewFilter;
    });
  }, [interviewRows, interviewFilter]);

  const showInterviews = kindTab === "all" || kindTab === "interviews";
  const showProposals = kindTab === "all" || kindTab === "proposals";
  const forceCompleteProfile = searchParams.get("completeProfile") === "1";

  const glassCard =
    "rounded-2xl border border-white/10 bg-[#151515]/85 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.35)]";
  const inputClass =
    "w-full rounded-xl border border-zinc-700 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30";
  const primaryButtonClass =
    "inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto";
  const ghostButtonClass =
    "inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto";

  const clearPendingLogo = useCallback(() => {
    if (pendingLogoObjectUrlRef.current != null) {
      URL.revokeObjectURL(pendingLogoObjectUrlRef.current);
      pendingLogoObjectUrlRef.current = null;
    }
    setPendingLogoPreviewUrl(null);
    setPendingLogoFile(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingLogoObjectUrlRef.current != null) {
        URL.revokeObjectURL(pendingLogoObjectUrlRef.current);
        pendingLogoObjectUrlRef.current = null;
      }
    };
  }, []);

  const loadCompanyProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    const res = await fetch("/api/update-company-profile", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      profile?: Partial<CompanyProfile> | null;
    };
    if (!res.ok || json.success !== true) {
      setProfileLoading(false);
      if (json.error) setProfileError(json.error);
      return;
    }
    setProfileError(null);
    clearPendingLogo();
    const p = json.profile ?? null;
    setHasCompanyProfile(p != null);
    setProfile(mapApiProfileToState(p ?? undefined));
    if (!(typeof p?.logo_path === "string" && p.logo_path.trim() !== "")) {
      setLogoPreview(null);
    }
    setProfileLoading(false);
  }, [clearPendingLogo]);

  const loadRequirements = useCallback(async () => {
    setRequirementsLoading(true);
    setRequirementsError(null);
    const res = await fetch("/api/company-resource-requirements", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      requirements?: RequirementRow[];
    };
    if (!res.ok || json.success !== true) {
      setRequirementsLoading(false);
      setRequirementsError(json.error ?? "Could not load requirements");
      return;
    }
    setRequirements(json.requirements ?? []);
    setRequirementsLoading(false);
  }, []);

  const loadDashboard = useCallback(async (trimmed: string) => {
    setDashboardEmail(trimmed);
    setLoading(true);
    setError(null);
    setInterviewFilter("all");
    setKindTab("all");
    setBookingNoticeByInterviewId({});
    setCvBusyByInterviewId({});
    setBlockedDatesByResourceId({});

    const companyProfileRes = await fetch("/api/update-company-profile", { cache: "no-store" });
    const companyProfileJson = (await companyProfileRes.json().catch(() => ({}))) as {
      success?: boolean;
      profile?: Partial<CompanyProfile> | null;
    };
    const companyProfile = companyProfileJson.success === true ? companyProfileJson.profile ?? null : null;
    const profileEmail =
      typeof companyProfile?.contact_email === "string" && companyProfile.contact_email.trim() !== ""
        ? companyProfile.contact_email.trim()
        : null;
    const profileCompany =
      typeof companyProfile?.company_name === "string" && companyProfile.company_name.trim() !== ""
        ? companyProfile.company_name.trim()
        : null;

    const emailCandidates = [...new Set([trimmed, profileEmail].filter((v): v is string => v != null && v !== ""))];
    const companyCandidates = [...new Set([profileCompany].filter((v): v is string => v != null && v !== ""))];

    const interviewQueries = [
      ...emailCandidates.map((email) =>
        supabase
          .from("interview_requests")
          .select(
            "id, resource_id, company_name, requester_name, requester_email, message, proposed_slot_1, proposed_slot_2, proposed_slot_3, selected_slot, decline_message, alternative_slots, reschedule_message, reschedule_slots, status, created_at",
          )
          .ilike("requester_email", email),
      ),
      ...companyCandidates.map((company) =>
        supabase
          .from("interview_requests")
          .select(
            "id, resource_id, company_name, requester_name, requester_email, message, proposed_slot_1, proposed_slot_2, proposed_slot_3, selected_slot, decline_message, alternative_slots, reschedule_message, reschedule_slots, status, created_at",
          )
          .ilike("company_name", company),
      ),
    ];
    const proposalQueries = [
      ...emailCandidates.map((email) =>
        supabase
          .from("engagement_proposals")
          .select(
            "id, resource_id, company_name, requester_name, requester_email, proposed_start_date, proposed_end_date, scope, proposed_rate, status, created_at",
          )
          .ilike("requester_email", email),
      ),
      ...companyCandidates.map((company) =>
        supabase
          .from("engagement_proposals")
          .select(
            "id, resource_id, company_name, requester_name, requester_email, proposed_start_date, proposed_end_date, scope, proposed_rate, status, created_at",
          )
          .ilike("company_name", company),
      ),
    ];
    const [interviewResults, proposalResults] = await Promise.all([
      Promise.all(interviewQueries),
      Promise.all(proposalQueries),
    ]);

    const interviewMap = new Map<string, Record<string, unknown>>();
    const proposalMap = new Map<string, Record<string, unknown>>();
    const errParts: string[] = [];
    for (const res of interviewResults) {
      if (res.error) {
        errParts.push(`Interview requests: ${res.error.message}`);
        continue;
      }
      for (const row of res.data ?? []) {
        interviewMap.set(String((row as { id: unknown }).id), row as Record<string, unknown>);
      }
    }
    for (const res of proposalResults) {
      if (res.error) {
        errParts.push(`Engagement proposals: ${res.error.message}`);
        continue;
      }
      for (const row of res.data ?? []) {
        proposalMap.set(String((row as { id: unknown }).id), row as Record<string, unknown>);
      }
    }
    const interviewData = [...interviewMap.values()].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
    const proposalData = [...proposalMap.values()].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );

    if (errParts.length > 0) {
      setError(errParts.join(" "));
    } else {
      setError(null);
    }

    type InterviewRequestBase = Omit<
      InterviewRequestRow,
      | "consultant_name"
      | "consultant_headline"
      | "consultant_bio"
      | "consultant_hourly_rate"
      | "consultant_location"
      | "consultant_avatar_key"
      | "consultant_cv_path"
      | "available_from"
      | "next_blocked_date"
    >;
    const baseInterviews: InterviewRequestBase[] = interviewData.map((r) => ({
      id: r.id as string,
      resource_id: r.resource_id as string,
      company_name: r.company_name as string,
      requester_name: (r.requester_name as string) ?? "",
      requester_email: (r.requester_email as string) ?? "",
      message: (r.message as string | null) ?? null,
      proposed_slot_1: (r.proposed_slot_1 as string | null) ?? null,
      proposed_slot_2: (r.proposed_slot_2 as string | null) ?? null,
      proposed_slot_3: (r.proposed_slot_3 as string | null) ?? null,
      selected_slot: (r.selected_slot as string | null) ?? null,
      decline_message: (r.decline_message as string | null) ?? null,
      alternative_slots: Array.isArray(r.alternative_slots)
        ? r.alternative_slots.filter((v): v is string => typeof v === "string")
        : null,
      reschedule_message: (r.reschedule_message as string | null) ?? null,
      reschedule_slots: Array.isArray(r.reschedule_slots)
        ? r.reschedule_slots.filter((v): v is string => typeof v === "string")
        : null,
      status: (r.status as string) ?? "requested",
      created_at: (r.created_at as string) ?? "",
    }));

    type EngagementProposalBase = Omit<
      EngagementProposalRow,
      | "consultant_name"
      | "consultant_headline"
      | "consultant_hourly_rate"
      | "consultant_location"
      | "consultant_avatar_key"
      | "available_from"
      | "next_blocked_date"
    >;
    const baseProposals: EngagementProposalBase[] = proposalData.map((r) => ({
      id: r.id as string,
      resource_id: r.resource_id as string,
      company_name: r.company_name as string,
      requester_name: r.requester_name as string,
      requester_email: (r.requester_email as string) ?? "",
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
    const headlineByResourceId: Record<string, string | null> = {};
    const bioByResourceId: Record<string, string | null> = {};
    const hourlyByResourceId: Record<string, number | null> = {};
    const locationByResourceId: Record<string, string | null> = {};
    const avatarKeyByResourceId: Record<string, string | null> = {};
    const cvPathByResourceId: Record<string, string | null> = {};
    const availableFromByResourceId: Record<string, string | null> = {};
    const nextBlockedByResourceId: Record<string, string | null> = {};

    if (uniqueResourceIds.length > 0) {
      const { data: resourceRows } = await supabase
        .from("resources")
        .select("id, name, headline, bio, hourly_rate, location, avatar_key, cv_document_path, available_from")
        .in("id", uniqueResourceIds);

      for (const row of resourceRows ?? []) {
        const id = row.id as string;
        const name = row.name as string | null;
        if (name != null && name.trim() !== "") {
          nameByResourceId[id] = name.trim();
        }
        const headline = row.headline as string | null;
        headlineByResourceId[id] = headline != null && headline.trim() !== "" ? headline.trim() : null;
        const bio = row.bio as string | null;
        bioByResourceId[id] = bio != null && bio.trim() !== "" ? bio.trim() : null;
        const hourly = row.hourly_rate as number | null;
        hourlyByResourceId[id] = hourly != null && Number.isFinite(hourly) ? hourly : null;
        const location = row.location as string | null;
        locationByResourceId[id] = location != null && location.trim() !== "" ? location.trim() : null;
        const avatar = row.avatar_key as string | null;
        avatarKeyByResourceId[id] = avatar != null && avatar.trim() !== "" ? avatar.trim() : null;
        const cvPath = row.cv_document_path as string | null;
        cvPathByResourceId[id] = cvPath != null && cvPath.trim() !== "" ? cvPath.trim() : null;
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

      const blockedByResourceRecord: Record<string, string[]> = {};
      for (const id of uniqueResourceIds) {
        const upcoming = upcomingBlockedByResource.get(id);
        blockedByResourceRecord[id] = upcoming != null ? [...upcoming] : [];
        nextBlockedByResourceId[id] =
          upcoming != null && upcoming.length > 0 ? upcoming[0] : null;
      }
      setBlockedDatesByResourceId(blockedByResourceRecord);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[company-dashboard] identity and counts", {
        authEmail: trimmed,
        companyProfileContactEmail: profileEmail,
        companyProfileCompanyName: profileCompany,
        interviewCount: baseInterviews.length,
        proposalCount: baseProposals.length,
      });
    }

    setInterviewRows(
      interviewResults.some((r) => r.error != null)
        ? []
        : baseInterviews.map((r) => ({
            ...r,
            consultant_name: nameByResourceId[r.resource_id] ?? null,
            consultant_headline: headlineByResourceId[r.resource_id] ?? null,
            consultant_bio: bioByResourceId[r.resource_id] ?? null,
            consultant_hourly_rate: hourlyByResourceId[r.resource_id] ?? null,
            consultant_location: locationByResourceId[r.resource_id] ?? null,
            consultant_avatar_key: avatarKeyByResourceId[r.resource_id] ?? null,
            consultant_cv_path: cvPathByResourceId[r.resource_id] ?? null,
            available_from: availableFromByResourceId[r.resource_id] ?? null,
            next_blocked_date: nextBlockedByResourceId[r.resource_id] ?? null,
          })),
    );
    setProposalRows(
      proposalResults.some((r) => r.error != null)
        ? []
        : baseProposals.map((r) => ({
            ...r,
            consultant_name: nameByResourceId[r.resource_id] ?? null,
            consultant_headline: headlineByResourceId[r.resource_id] ?? null,
            consultant_hourly_rate: hourlyByResourceId[r.resource_id] ?? null,
            consultant_location: locationByResourceId[r.resource_id] ?? null,
            consultant_avatar_key: avatarKeyByResourceId[r.resource_id] ?? null,
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
      await Promise.all([loadDashboard(trimmed), loadCompanyProfile(), loadRequirements()]);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, loadDashboard, loadCompanyProfile, loadRequirements]);

  const toggleInterest = useCallback((interest: string) => {
    setProfile((prev) => {
      const has = prev.talent_interests.includes(interest);
      return {
        ...prev,
        talent_interests: has
          ? prev.talent_interests.filter((v) => v !== interest)
          : [...prev.talent_interests, interest],
      };
    });
  }, []);

  const onLogoFileChosen = useCallback((file: File) => {
    setProfileError(null);
    setProfileSuccess(null);
    if (pendingLogoObjectUrlRef.current != null) {
      URL.revokeObjectURL(pendingLogoObjectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    pendingLogoObjectUrlRef.current = url;
    setPendingLogoPreviewUrl(url);
    setPendingLogoFile(file);
  }, []);

  const saveProfile = useCallback(async () => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    const inline: CompanyProfileInlineErrors = {};
    if (profile.company_name.trim() === "") {
      inline.company_name = "Company name is required.";
    }
    if (profile.contact_person.trim() === "") {
      inline.contact_person = "Contact person is required.";
    }
    if (profile.contact_email.trim() === "") {
      inline.contact_email = "Contact email is required.";
    }
    if (Object.keys(inline).length > 0) {
      setProfileInlineErrors(inline);
      setProfileSaving(false);
      return;
    }
    setProfileInlineErrors({});
    const pendingFile = pendingLogoFile;
    const res = await fetch("/api/update-company-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      profile?: Partial<CompanyProfile> | null;
    };
    if (!res.ok || json.success !== true) {
      setProfileSaving(false);
      setProfileError(json.error ?? "Could not save company profile");
      return;
    }
    if (json.profile != null) {
      setProfile(mapApiProfileToState(json.profile));
    }
    setHasCompanyProfile(true);

    let logoUploaded = false;
    if (pendingFile != null) {
      setLogoUploading(true);
      const form = new FormData();
      form.set("file", pendingFile);
      const upRes = await fetch("/api/upload-company-logo", { method: "POST", body: form });
      const upJson = (await upRes.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        path?: string;
        publicUrl?: string | null;
        signedUrl?: string | null;
      };
      setLogoUploading(false);
      if (!upRes.ok || upJson.success !== true || !upJson.path) {
        setProfileSaving(false);
        setProfileError(upJson.error ?? "Could not upload logo");
        return;
      }
      logoUploaded = true;
      clearPendingLogo();
      setProfile((prev) => ({ ...prev, logo_path: upJson.path as string }));
      setLogoPreview((upJson.signedUrl ?? upJson.publicUrl) ?? null);
    }

    setProfileSaving(false);
    const lines = ["Company profile saved."];
    if (logoUploaded) lines.push("Logo uploaded.");
    setProfileSuccess(lines.join("\n"));
  }, [profile, pendingLogoFile, clearPendingLogo]);

  useEffect(() => {
    let cancelled = false;
    if (!profile.logo_path || profile.logo_path.trim() === "") {
      return;
    }
    void (async () => {
      const res = await fetch("/api/company-logo-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: profile.logo_path }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string | null };
      if (!cancelled) {
        setLogoPreview(typeof json.url === "string" && json.url.trim() !== "" ? json.url : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.logo_path]);

  const submitRequirement = useCallback(async () => {
    setRequirementSaving(true);
    setRequirementsError(null);
    const res = await fetch("/api/company-resource-requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requirementForm),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
    if (!res.ok || json.success !== true) {
      setRequirementSaving(false);
      setRequirementsError(json.error ?? "Could not add requirement");
      return;
    }
    setRequirementSaving(false);
    setRequirementForm({
      title: "",
      role_type: "",
      job_spec: "",
      rate_min: "",
      rate_max: "",
      start_date: "",
      location: "",
    });
    await loadRequirements();
  }, [requirementForm, loadRequirements]);

  const downloadAcceptedInterviewInvite = useCallback((row: InterviewRequestRow) => {
    if (row.selected_slot == null || row.selected_slot.trim() === "") return;
    const ics = createInterviewIcs({
      title: `Procal interview — ${consultantLabelInterview(row)}`,
      description: `Interview confirmed for ${row.company_name}. Requester: ${row.requester_name || "Company contact"}.`,
      start: row.selected_slot,
      durationMinutes: 30,
      organizerEmail: "info@procal.co.za",
      attendeeEmail: row.requester_email.trim() || "company@procal.co.za",
    });
    const blob = new Blob([ics.content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = ics.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, []);

  const copyBookingLink = useCallback(async (rowId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/company`; // TODO: move to share-safe route /company/interviews/[id]
    try {
      await navigator.clipboard.writeText(url);
      setBookingNoticeByInterviewId((prev) => ({ ...prev, [rowId]: "Link copied" }));
    } catch {
      setBookingNoticeByInterviewId((prev) => ({ ...prev, [rowId]: "Could not copy link" }));
    }
  }, []);

  const viewTalentCv = useCallback(async (row: InterviewRequestRow) => {
    setCvBusyByInterviewId((prev) => ({ ...prev, [row.id]: true }));
    setBookingNoticeByInterviewId((prev) => ({ ...prev, [row.id]: "" }));
    const res = await fetch("/api/company-view-talent-cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId: row.resource_id }),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; url?: string };
    setCvBusyByInterviewId((prev) => ({ ...prev, [row.id]: false }));
    if (!res.ok || json.success !== true || !json.url) {
      setBookingNoticeByInterviewId((prev) => ({ ...prev, [row.id]: json.error ?? "Could not open CV" }));
      return;
    }
    window.open(json.url, "_blank", "noopener,noreferrer");
  }, []);

  const acceptInterviewTime = useCallback(
    async (row: InterviewRequestRow, slot: string) => {
      setBookingNoticeByInterviewId((prev) => ({ ...prev, [row.id]: "" }));
      const { error: updateError } = await supabase
        .from("interview_requests")
        .update({
          status: "accepted",
          selected_slot: slot,
          decline_message: null,
          alternative_slots: null,
          reschedule_message: null,
          reschedule_slots: null,
        })
        .eq("id", row.id);
      if (updateError != null) {
        setBookingNoticeByInterviewId((prev) => ({ ...prev, [row.id]: updateError.message || "Could not accept this time." }));
        return;
      }
      setInterviewRows((prev) =>
        prev == null
          ? prev
          : prev.map((item) =>
              item.id === row.id
                ? {
                    ...item,
                    status: "accepted",
                    selected_slot: slot,
                    decline_message: null,
                    alternative_slots: null,
                    reschedule_message: null,
                    reschedule_slots: null,
                  }
                : item,
            ),
      );
    },
    [supabase],
  );

  const submitRescheduleRequest = useCallback(async () => {
    if (rescheduleModalRow == null) return;
    const slots = rescheduleSlotsDraft.map((v) => v.trim()).filter((v) => v !== "");
    if (slots.length === 0) {
      setBookingNoticeByInterviewId((prev) => ({
        ...prev,
        [rescheduleModalRow.id]: "Add at least one new time.",
      }));
      return;
    }
    setRescheduleBusy(true);
    const { error: updateError } = await supabase
      .from("interview_requests")
      .update({
        status: "reschedule_requested",
        reschedule_slots: slots,
        reschedule_message: rescheduleMessageDraft.trim() || null,
      })
      .eq("id", rescheduleModalRow.id);
    setRescheduleBusy(false);
    if (updateError != null) {
      setBookingNoticeByInterviewId((prev) => ({
        ...prev,
        [rescheduleModalRow.id]: updateError.message || "Could not request reschedule.",
      }));
      return;
    }
    setInterviewRows((prev) =>
      prev == null
        ? prev
        : prev.map((item) =>
            item.id === rescheduleModalRow.id
              ? {
                  ...item,
                  status: "reschedule_requested",
                  reschedule_slots: slots,
                  reschedule_message: rescheduleMessageDraft.trim() || null,
                }
              : item,
          ),
    );
    setRescheduleModalRow(null);
    setRescheduleSlotsDraft(["", "", ""]);
    setRescheduleMessageDraft("");
  }, [rescheduleModalRow, rescheduleSlotsDraft, rescheduleMessageDraft, supabase]);

  const cancelInterviewRequest = useCallback(
    async (row: InterviewRequestRow) => {
      const { error: updateError } = await supabase
        .from("interview_requests")
        .update({ status: "cancelled" })
        .eq("id", row.id);
      if (updateError != null) {
        setBookingNoticeByInterviewId((prev) => ({ ...prev, [row.id]: updateError.message || "Could not cancel request." }));
        return;
      }
      setInterviewRows((prev) =>
        prev == null ? prev : prev.map((item) => (item.id === row.id ? { ...item, status: "cancelled" } : item)),
      );
    },
    [supabase],
  );

  const hasLoaded = interviewRows !== null && proposalRows !== null;
  const totalInterviews = interviewRows?.length ?? 0;
  const totalProposals = proposalRows?.length ?? 0;
  const bothEmpty = hasLoaded && totalInterviews === 0 && totalProposals === 0;
  const welcomeName = profile.company_name.trim() || "Company";
  const logoFallbackLetter = welcomeName.charAt(0).toUpperCase() || "C";
  const companyProfileComplete = isCompanyProfileComplete(profile);
  const displayedActiveSection: ActiveSection =
    forceCompleteProfile || !companyProfileComplete ? "profile" : activeSection;
  const modalAvailableFromIso =
    availabilityModalRow?.available_from != null && availabilityModalRow.available_from.trim() !== ""
      ? availabilityModalRow.available_from.trim()
      : null;
  const modalBlockedDates = useMemo(
    () =>
      availabilityModalRow != null
        ? blockedDatesByResourceId[availabilityModalRow.resource_id] ?? []
        : [],
    [availabilityModalRow, blockedDatesByResourceId],
  );
  const modalBlockedSet = useMemo(() => new Set(modalBlockedDates), [modalBlockedDates]);
  const availabilityCalendarDays = useMemo(
    () => buildMonthGrid(startOfMonth(availabilityModalMonth)),
    [availabilityModalMonth],
  );
  const availabilityMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-ZA", {
        month: "long",
        year: "numeric",
      }).format(availabilityModalMonth),
    [availabilityModalMonth],
  );

  const interviewHeroSummary = useMemo(() => {
    const rows = interviewRows ?? [];
    let interviewsScheduled = 0;
    let actionsRequired = 0;
    for (const r of rows) {
      const s = r.status.toLowerCase();
      if (s === "accepted" && r.selected_slot != null && String(r.selected_slot).trim() !== "") {
        interviewsScheduled += 1;
      }
      if (s === "declined_with_alternatives" || s === "reschedule_requested" || s === "requested") {
        actionsRequired += 1;
      }
    }
    return { interviewsScheduled, actionsRequired };
  }, [interviewRows]);

  const goToEngagementsFromHero = useCallback(
    (canScroll: boolean) => {
      setActiveSection("engagements");
      if (!canScroll) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById("company-dashboard-engagements")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      });
    },
    [],
  );

  const showWelcomeModal = searchParams.get("welcome") === "1";
  const dismissWelcomeModal = useCallback(() => {
    router.replace("/company");
  }, [router]);

  return (
    <>
      <AppTopNav />
      <main className="min-h-screen bg-[#090909] px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <header className={`${glassCard} p-6 md:p-8`}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 md:h-16 md:w-16 md:rounded-2xl">
                    {logoPreview ? (
                      <Image
                        src={logoPreview}
                        alt={`${welcomeName} logo`}
                        className="h-full w-full object-cover"
                        width={64}
                        height={64}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-200 md:text-xl">
                        {logoFallbackLetter}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">COMPANY DASHBOARD</p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">
                      Welcome back, {welcomeName}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                      Manage your company profile, talent needs, and engagement activity.
                    </p>
                    {dashboardEmail ? <p className="mt-3 text-xs text-zinc-500">Signed in as {dashboardEmail}</p> : null}
                  </div>
                </div>
              </div>
              <div className="w-full shrink-0 lg:max-w-xs lg:self-stretch">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Interviews</p>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <p className="text-xs font-medium text-zinc-400">Interviews scheduled</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">
                          {interviewHeroSummary.interviewsScheduled}
                        </p>
                      </div>
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400/80 ring-2 ring-emerald-500/25" aria-hidden />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (interviewHeroSummary.actionsRequired > 0) {
                          goToEngagementsFromHero(companyProfileComplete && !forceCompleteProfile);
                        }
                      }}
                      disabled={interviewHeroSummary.actionsRequired === 0}
                      className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition ${
                        interviewHeroSummary.actionsRequired > 0
                          ? "border-amber-500/35 bg-amber-500/[0.07] ring-1 ring-amber-500/15"
                          : "border-transparent"
                      } ${interviewHeroSummary.actionsRequired === 0 ? "cursor-default opacity-80" : "cursor-pointer hover:bg-amber-500/10"}`}
                    >
                      <div>
                        <p
                          className={`text-xs font-medium ${
                            interviewHeroSummary.actionsRequired > 0 ? "text-amber-100" : "text-zinc-400"
                          }`}
                        >
                          Actions / reschedule requests
                        </p>
                        <p
                          className={`mt-1 text-2xl font-semibold tabular-nums ${
                            interviewHeroSummary.actionsRequired > 0 ? "text-amber-300" : "text-orange-400/80"
                          }`}
                        >
                          {interviewHeroSummary.actionsRequired}
                        </p>
                        {interviewHeroSummary.actionsRequired > 0 ? (
                          <p className="mt-1 text-[11px] text-amber-200/70">Open interviews & engagements</p>
                        ) : null}
                      </div>
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                          interviewHeroSummary.actionsRequired > 0
                            ? "bg-amber-400 ring-2 ring-amber-400/30"
                            : "bg-orange-500/50 ring-2 ring-orange-500/20"
                        }`}
                        aria-hidden
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>
          {forceCompleteProfile || !companyProfileComplete ? (
            <section className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-5">
              <h2 className="text-base font-semibold text-amber-100">Complete your company profile</h2>
              <p className="mt-1 text-sm text-amber-50/80">
                Before you can request interviews or propose engagements, complete your company details.
              </p>
              <button
                type="button"
                onClick={() => setActiveSection("profile")}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white"
              >
                Company profile
              </button>
            </section>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { id: "profile", title: "Company profile", copy: "Update your company details and branding." },
                { id: "interests", title: "Talent interests", copy: "Select roles you want to engage." },
                {
                  id: "hiring",
                  title: "Hiring needs",
                  copy: "Define the roles you are looking to fill.",
                },
                { id: "engagements", title: "Interviews & engagements", copy: "Track interview and proposal activity." },
              ] satisfies { id: ActiveSection; title: string; copy: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`rounded-2xl border p-4 text-left transition hover:bg-white/10 ${
                  displayedActiveSection === item.id
                    ? "border-orange-500 bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{item.copy}</p>
              </button>
            ))}
          </section>

          {displayedActiveSection === "profile" ? (
            <section className={`${glassCard} p-6 transition-opacity duration-200 md:p-8`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Company profile</h2>
              <button
                type="button"
                disabled={profileSaving || logoUploading}
                onClick={saveProfile}
                className={primaryButtonClass}
              >
                {profileSaving || logoUploading ? "Saving..." : "Save profile"}
              </button>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Keep your workspace profile up to date so talent sees the right context.
            </p>
            {!hasCompanyProfile && !profileLoading ? (
              <p className="mt-2 text-sm text-zinc-300">Create your company profile to start engaging talent.</p>
            ) : null}
            {profileLoading ? <p className="mt-3 text-sm text-zinc-500">Loading company profile...</p> : null}
            {profileError ? <p className="mt-3 text-sm text-red-300">{profileError}</p> : null}
            {profileSuccess ? (
              <div className="mt-3 space-y-1 text-sm text-emerald-300">
                {profileSuccess.split("\n").map((line, idx) => (
                  <p key={`${idx}-${line.slice(0, 12)}`}>{line}</p>
                ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Company name</span>
                <input
                  value={profile.company_name}
                  onChange={(e) => {
                    setProfile((prev) => ({ ...prev, company_name: e.target.value }));
                    setProfileInlineErrors((prev) => {
                      const next = { ...prev };
                      delete next.company_name;
                      return next;
                    });
                  }}
                  className={inputClass}
                  aria-invalid={profileInlineErrors.company_name != null}
                />
                {profileInlineErrors.company_name ? (
                  <p className="text-xs text-amber-200/90">{profileInlineErrors.company_name}</p>
                ) : null}
              </label>
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Logo</span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-xl border border-zinc-700 bg-black/40">
                    {pendingLogoPreviewUrl != null ? (
                      <Image
                        src={pendingLogoPreviewUrl}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                        width={56}
                        height={56}
                        unoptimized
                      />
                    ) : logoPreview != null ? (
                      <Image src={logoPreview} alt="Company logo" className="h-full w-full object-cover" width={56} height={56} />
                    ) : profile.logo_path.trim() !== "" ? (
                      <div className="flex h-full items-center justify-center text-[10px] text-green-400">Uploaded</div>
                    ) : (
                      <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-zinc-500">
                        Optional
                      </div>
                    )}
                  </div>
                  <label
                    className={`inline-flex cursor-pointer items-center rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 ${
                      profileSaving || logoUploading ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {profile.logo_path.trim() !== "" ? "Replace logo" : "Choose logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={profileSaving || logoUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        onLogoFileChosen(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {logoUploading ? <span className="text-xs text-zinc-500">Uploading...</span> : null}
                  {!logoUploading && pendingLogoFile != null ? (
                    <span className="text-xs font-medium text-sky-300/90">Ready to upload after save</span>
                  ) : null}
                  {!logoUploading && pendingLogoFile == null && profile.logo_path.trim() !== "" ? (
                    <span className="text-xs font-medium text-green-400">✓ Uploaded</span>
                  ) : null}
                  {!logoUploading && pendingLogoFile == null && profile.logo_path.trim() === "" ? (
                    <span className="text-xs font-medium text-zinc-500">Optional</span>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-500">Optional. You can add or replace this later.</p>
              </div>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Contact person</span>
                <input
                  value={profile.contact_person}
                  onChange={(e) => {
                    setProfile((prev) => ({ ...prev, contact_person: e.target.value }));
                    setProfileInlineErrors((prev) => {
                      const next = { ...prev };
                      delete next.contact_person;
                      return next;
                    });
                  }}
                  className={inputClass}
                  aria-invalid={profileInlineErrors.contact_person != null}
                />
                {profileInlineErrors.contact_person ? (
                  <p className="text-xs text-amber-200/90">{profileInlineErrors.contact_person}</p>
                ) : null}
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Contact email</span>
                <input
                  value={profile.contact_email}
                  onChange={(e) => {
                    setProfile((prev) => ({ ...prev, contact_email: e.target.value }));
                    setProfileInlineErrors((prev) => {
                      const next = { ...prev };
                      delete next.contact_email;
                      return next;
                    });
                  }}
                  className={inputClass}
                  aria-invalid={profileInlineErrors.contact_email != null}
                />
                {profileInlineErrors.contact_email ? (
                  <p className="text-xs text-amber-200/90">{profileInlineErrors.contact_email}</p>
                ) : null}
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Contact number</span>
                <input
                  value={profile.contact_number}
                  onChange={(e) => setProfile((prev) => ({ ...prev, contact_number: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Website</span>
                <input
                  value={profile.website}
                  onChange={(e) => setProfile((prev) => ({ ...prev, website: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Location</span>
                <input
                  value={profile.location}
                  onChange={(e) => setProfile((prev) => ({ ...prev, location: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Short company description</span>
                <textarea
                  rows={4}
                  value={profile.description}
                  onChange={(e) => setProfile((prev) => ({ ...prev, description: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
            </section>
          ) : null}

          {displayedActiveSection === "interests" ? (
            <section className={`${glassCard} p-6 transition-opacity duration-200 md:p-8`}>
            <h2 className="text-lg font-semibold text-zinc-100">Talent interests</h2>
            <p className="mt-1 text-sm text-zinc-400">IT Consulting</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = profile.talent_interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={
                      selected
                        ? "rounded-full border border-orange-500 bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white"
                        : "rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500"
                    }
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 border-t border-white/10 pt-6">
              <button
                type="button"
                disabled={profileSaving}
                onClick={saveProfile}
                className={`${primaryButtonClass} md:ml-auto`}
              >
                {profileSaving ? "Saving..." : "Save interests"}
              </button>
            </div>
            </section>
          ) : null}

          {displayedActiveSection === "hiring" ? (
            <section className={`${glassCard} p-6 transition-opacity duration-200 md:p-8`}>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-zinc-100">Hiring needs</h2>
              <p className="text-sm text-zinc-400">Add open roles and requirements for your team.</p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Position / title</span>
                <input
                  value={requirementForm.title}
                  onChange={(e) => setRequirementForm((prev) => ({ ...prev, title: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Resource type</span>
                <input
                  value={requirementForm.role_type}
                  onChange={(e) => setRequirementForm((prev) => ({ ...prev, role_type: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Job spec / requirement</span>
                <textarea
                  rows={4}
                  value={requirementForm.job_spec}
                  onChange={(e) => setRequirementForm((prev) => ({ ...prev, job_spec: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Rate range min</span>
                  <input
                    value={requirementForm.rate_min}
                    onChange={(e) => setRequirementForm((prev) => ({ ...prev, rate_min: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Rate range max</span>
                  <input
                    value={requirementForm.rate_max}
                    onChange={(e) => setRequirementForm((prev) => ({ ...prev, rate_max: e.target.value }))}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Start date</span>
                <input
                  type="date"
                  value={requirementForm.start_date}
                  onChange={(e) => setRequirementForm((prev) => ({ ...prev, start_date: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Location / remote preference
                </span>
                <input
                  value={requirementForm.location}
                  onChange={(e) => setRequirementForm((prev) => ({ ...prev, location: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  disabled={requirementSaving}
                  onClick={() =>
                    setRequirementForm({
                      title: "",
                      role_type: "",
                      job_spec: "",
                      rate_min: "",
                      rate_max: "",
                      start_date: "",
                      location: "",
                    })
                  }
                  className={ghostButtonClass}
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={requirementSaving}
                  onClick={() => void submitRequirement()}
                  className={primaryButtonClass}
                >
                  {requirementSaving ? "Adding..." : "Add role"}
                </button>
              </div>
            </div>
            {requirementsError ? <p className="mt-3 text-sm text-red-300">{requirementsError}</p> : null}
            {requirementsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading requirements...</p> : null}
            {!requirementsLoading && requirements.length === 0 ? (
              <p className="mt-4 rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-300">
                Add your first hiring need.
              </p>
            ) : null}
            {requirements.length > 0 ? (
              <ul className="mt-4 grid gap-3">
                {requirements.map((item) => (
                  <li key={item.id} className="rounded-xl border border-zinc-800 bg-black/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900/70 px-2.5 py-1 text-xs text-zinc-300">
                        {item.status ?? "open"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">
                      {item.role_type ?? "—"} · {item.location ?? "—"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{item.job_spec ?? "—"}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Rate: {formatRateZar(item.rate_min)} to {formatRateZar(item.rate_max)} · Start:{" "}
                      {formatProposalDate(item.start_date)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            </section>
          ) : null}

          <div id="company-dashboard-engagements" className="scroll-mt-28 flex flex-col gap-6">
          {displayedActiveSection === "engagements" && loading ? <p className="text-sm text-zinc-500">Loading your dashboard...</p> : null}
          {displayedActiveSection === "engagements" && error ? (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
          ) : null}
          {displayedActiveSection === "engagements" && hasLoaded && !error && bothEmpty ? (
            <div className={`${glassCard} p-5`}>
              <p className="text-sm text-zinc-300">No activity yet. Browse the marketplace to find talent.</p>
              <Link
                href="/marketplace"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white"
              >
                Browse marketplace
              </Link>
            </div>
          ) : null}

          {displayedActiveSection === "engagements" && hasLoaded && !error && !bothEmpty ? (
            <>
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
                    <h3 className="text-sm font-semibold text-zinc-100">Interview requests</h3>
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
                    <p className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-300">
                      No activity yet. Browse the marketplace to find talent.
                    </p>
                  ) : filteredInterviews.length === 0 ? (
                    <p className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-300">
                      No interview requests match this filter.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-4">
                      {filteredInterviews.map((row) => {
                        const normalizedStatus = row.status.toLowerCase();
                        const isAcceptedStatus = normalizedStatus === "accepted";
                        const hasAlternatives = normalizedStatus === "declined_with_alternatives";
                        const isRescheduleRequested = normalizedStatus === "reschedule_requested";
                        const accepted =
                          isAcceptedStatus &&
                          row.selected_slot != null &&
                          String(row.selected_slot).trim() !== "";
                        const alternativeSlots = (row.alternative_slots ?? []).filter((slot) => slot.trim() !== "");
                        const activeRequestedSlots = isRescheduleRequested
                          ? (row.reschedule_slots ?? []).filter((slot) => slot.trim() !== "")
                          : [row.proposed_slot_1, row.proposed_slot_2, row.proposed_slot_3].filter(
                              (slot): slot is string => slot != null && slot.trim() !== "",
                            );
                        return (
                          <li key={row.id} className={`${glassCard} p-5 md:p-6`}>
                            {(() => {
                              const avatar = getPublicTalentAvatarDisplay(
                                row.consultant_avatar_key,
                                row.consultant_headline,
                                row.consultant_bio,
                              );
                              return (
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:gap-8">
                                  <div className="min-w-0">
                                    <div className="flex items-start gap-3">
                                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-700 bg-black/40">
                                        {avatar.imagePath ? (
                                          <Image src={avatar.imagePath} alt={avatar.label} width={48} height={48} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="flex h-full items-center justify-center text-base">
                                            {avatar.primary}
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-base font-semibold text-zinc-100">{consultantLabelInterview(row)}</p>
                                        <p className="truncate text-sm text-zinc-400">
                                          {row.consultant_headline?.trim() || "Talent profile"}
                                        </p>
                                        <p className="mt-1 text-xs text-zinc-500">
                                          {formatRateZar(row.consultant_hourly_rate)} · {row.consultant_location?.trim() || "Location not set"}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAvailabilityModalMonth(startOfMonth(new Date()));
                                        setAvailabilityModalRow(row);
                                      }}
                                      className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/10"
                                    >
                                      Availability
                                    </button>
                                    <div className="mt-3 flex flex-col gap-2">
                                      <Link
                                        href={consultantProfileHref(row.resource_id)}
                                        className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                                      >
                                        View profile
                                      </Link>
                                      <button
                                        type="button"
                                        disabled={!accepted || cvBusyByInterviewId[row.id] === true}
                                        onClick={() => void viewTalentCv(row)}
                                        className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {cvBusyByInterviewId[row.id] === true ? "Opening CV..." : "View CV"}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
                                      <p className="text-base font-semibold tracking-tight text-zinc-100">{row.company_name}</p>
                                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                        <span
                                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadgeClasses(row.status)}`}
                                        >
                                          {statusLabel(row.status)}
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                          Submitted{" "}
                                          {row.created_at
                                            ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(
                                                new Date(row.created_at),
                                              )
                                            : "—"}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-4">
                                      <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Message</h4>
                                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                                        {row.message?.trim() ? row.message : "—"}
                                      </p>
                                    </div>
                                    {!isAcceptedStatus ? (
                                      <div className="mt-4">
                                        <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                          {isRescheduleRequested ? "Reschedule slots" : "Proposed slots"}
                                        </h4>
                                        <div className="mt-2 grid gap-2 text-sm text-zinc-200 sm:grid-cols-3">
                                          {activeRequestedSlots.length === 0 ? (
                                            <div className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2 sm:col-span-3">
                                              <p className="text-xs text-zinc-500">No proposed times.</p>
                                            </div>
                                          ) : (
                                            activeRequestedSlots.map((slot, idx) => (
                                              <div key={`${row.id}-active-slot-${idx}`} className="rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
                                                <span className="text-xs text-zinc-500">Slot {idx + 1}</span>
                                                <p className="font-medium">{formatSlot(slot)}</p>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                        {isRescheduleRequested && row.reschedule_message?.trim() ? (
                                          <p className="mt-2 text-xs text-amber-200/90">Company message: {row.reschedule_message}</p>
                                        ) : null}
                                      </div>
                                    ) : null}
                                    {hasAlternatives ? (
                                      <div className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">Talent alternatives</p>
                                        {row.decline_message?.trim() ? (
                                          <p className="mt-1 text-sm text-amber-50/90">{row.decline_message}</p>
                                        ) : null}
                                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                          {alternativeSlots.map((slot, idx) => (
                                            <button
                                              key={`${row.id}-alt-slot-${idx}`}
                                              type="button"
                                              onClick={() => void acceptInterviewTime(row, slot)}
                                              className="rounded-lg border border-amber-300/35 bg-black/25 px-3 py-2 text-left text-sm text-zinc-100 transition hover:border-amber-200/55"
                                            >
                                              <span className="text-xs text-amber-200/80">Alternative {idx + 1}</span>
                                              <p className="font-medium">{formatSlot(slot)}</p>
                                              <p className="mt-1 text-xs text-amber-100">Accept this time</p>
                                            </button>
                                          ))}
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRescheduleModalRow(row);
                                              setRescheduleSlotsDraft(["", "", ""]);
                                              setRescheduleMessageDraft("");
                                            }}
                                            className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white transition hover:bg-orange-600"
                                          >
                                            Request new times
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => void cancelInterviewRequest(row)}
                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-400/40 bg-red-500/10 px-3 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
                                          >
                                            Cancel request
                                          </button>
                                        </div>
                                      </div>
                                    ) : null}
                                    {accepted ? (
                                      <div className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Accepted</p>
                                        <p className="mt-1 text-sm font-medium text-emerald-100">
                                          Confirmed time: {formatSlot(row.selected_slot)}
                                        </p>
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                          <button
                                            type="button"
                                            onClick={() => downloadAcceptedInterviewInvite(row)}
                                            className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white transition hover:bg-orange-600"
                                          >
                                            Add to calendar
                                          </button>
                                          <a
                                            href={`mailto:?subject=${encodeURIComponent("Interview booking confirmed")}&body=${encodeURIComponent(
                                              `Interview booking confirmed\n\nTalent: ${consultantLabelInterview(row)}\nConfirmed time: ${formatSlot(row.selected_slot)}\nCompany: ${row.company_name}\nDashboard: ${typeof window !== "undefined" ? window.location.origin : ""}/company\nTalent profile: ${typeof window !== "undefined" ? window.location.origin : ""}${consultantProfileHref(row.resource_id)}`,
                                            )}`}
                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
                                          >
                                            Forward booking
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => void copyBookingLink(row.id)}
                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
                                          >
                                            Copy link
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRescheduleModalRow(row);
                                              setRescheduleSlotsDraft(["", "", ""]);
                                              setRescheduleMessageDraft("");
                                            }}
                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
                                          >
                                            Reschedule interview
                                          </button>
                                        </div>
                                        {bookingNoticeByInterviewId[row.id] ? (
                                          <p className="mt-2 text-xs text-zinc-300">{bookingNoticeByInterviewId[row.id]}</p>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>

                                </div>
                              );
                            })()}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              ) : null}

              {showProposals ? (
                <section className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Engagement proposals</h3>
                  {totalProposals === 0 ? (
                    <p className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm text-zinc-300">
                      No activity yet. Browse the marketplace to find talent.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-4">
                      {(proposalRows ?? []).map((row) => (
                        <li key={row.id} className={`${glassCard} p-5 md:p-6`}>
                          <p className="text-sm text-zinc-400">
                            <span className="font-medium text-zinc-300">Consultant:</span> {consultantLabelProposal(row)}
                          </p>
                          <ConsultantAvailabilityContext availableFrom={row.available_from} nextBlocked={row.next_blocked_date} />
                          <div className="mt-2 flex flex-col gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-base font-semibold tracking-tight text-zinc-100">{row.company_name}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                <span className="font-medium text-zinc-400">Contact:</span> {row.requester_name}
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
                                  ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(
                                      new Date(row.created_at),
                                    )
                                  : "—"}
                              </span>
                            </div>
                          </div>
                          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Start</dt>
                              <dd className="mt-1 font-medium text-zinc-200">{formatProposalDate(row.proposed_start_date)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">End</dt>
                              <dd className="mt-1 font-medium text-zinc-200">{formatProposalDate(row.proposed_end_date)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Proposed rate</dt>
                              <dd className="mt-1 font-medium text-zinc-200">{formatRateZar(row.proposed_rate)}</dd>
                            </div>
                          </dl>
                          <div className="mt-4 border-t border-zinc-800 pt-4">
                            <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Scope</h4>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
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
          </div>
        </div>
      </main>
      {rescheduleModalRow != null ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close reschedule modal"
            onClick={() => setRescheduleModalRow(null)}
          />
          <div className="relative z-[131] w-full max-w-lg rounded-2xl border border-white/10 bg-[#111] p-6">
            <h3 className="text-lg font-semibold text-white">Request new interview times</h3>
            <p className="mt-1 text-sm text-zinc-400">Propose 1 to 3 new slots for {consultantLabelInterview(rescheduleModalRow)}.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((idx) => (
                <input
                  key={`reschedule-slot-${idx}`}
                  type="datetime-local"
                  value={rescheduleSlotsDraft[idx] ?? ""}
                  onChange={(e) =>
                    setRescheduleSlotsDraft((prev) => {
                      const next = [...prev] as [string, string, string];
                      next[idx] = e.target.value;
                      return next;
                    })
                  }
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-orange-500/40"
                />
              ))}
            </div>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Message (optional)
              <textarea
                rows={3}
                value={rescheduleMessageDraft}
                onChange={(e) => setRescheduleMessageDraft(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
              />
            </label>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRescheduleModalRow(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rescheduleBusy}
                onClick={() => void submitRescheduleRequest()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {rescheduleBusy ? "Sending..." : "Send new times"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {availabilityModalRow != null ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close availability modal"
            onClick={() => setAvailabilityModalRow(null)}
          />
          <div className="relative z-[121] w-full max-w-lg rounded-2xl border border-white/10 bg-[#111] p-6">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setAvailabilityModalRow(null)}
              className="absolute right-3 top-3 rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-white">Availability</h3>
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAvailabilityModalMonth((prev) => addMonths(prev, -1))}
                  className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
                >
                  Previous
                </button>
                <p className="text-sm font-medium text-zinc-200">{availabilityMonthLabel}</p>
                <button
                  type="button"
                  onClick={() => setAvailabilityModalMonth((prev) => addMonths(prev, 1))}
                  className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
                >
                  Next
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span key={d} className="py-1">
                    {d}
                  </span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {availabilityCalendarDays.map((day) => {
                  const dayIso = localIsoDate(day);
                  const inMonth = day.getMonth() === availabilityModalMonth.getMonth();
                  const blocked = modalBlockedSet.has(dayIso);
                  const beforeAvailable = modalAvailableFromIso != null && dayIso < modalAvailableFromIso;
                  const unavailable = blocked || beforeAvailable;
                  const dayClass = !inMonth
                    ? "border-transparent bg-transparent text-zinc-600"
                    : unavailable
                      ? "border border-red-500/20 bg-red-500/10 text-zinc-300"
                      : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
                  return (
                    <div
                      key={dayIso}
                      className={`flex h-9 items-center justify-center rounded-md text-xs ${dayClass}`}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Available from</p>
                <p className="mt-1 text-zinc-200">
                  {modalAvailableFromIso != null
                    ? formatCardDate(modalAvailableFromIso)
                    : "Available now"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Next unavailable</p>
                <p className="mt-1 text-zinc-200">
                  {availabilityModalRow.next_blocked_date != null && availabilityModalRow.next_blocked_date.trim() !== ""
                    ? formatCardDate(availabilityModalRow.next_blocked_date)
                    : "No upcoming blocked dates available in this view"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Unavailable dates or periods</p>
                {modalBlockedDates.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-zinc-300">
                    {modalBlockedDates.slice(0, 8).map((iso) => (
                      <li key={iso}>- {formatCardDate(iso)}</li>
                    ))}
                    {modalBlockedDates.length > 8 ? <li>- +{modalBlockedDates.length - 8} more</li> : null}
                  </ul>
                ) : (
                  <p className="mt-1 text-zinc-300">No additional unavailable periods available in this view</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Recurring availability rules</p>
                <p className="mt-1 text-zinc-300">No recurring rules available in this view</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setAvailabilityModalRow(null)}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <WelcomeToProcalModal
        open={showWelcomeModal}
        onClose={dismissWelcomeModal}
        variant="company"
        onCompanyCompleteProfile={() => setActiveSection("profile")}
      />
    </>
  );
}
