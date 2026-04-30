"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { WelcomeToProcalModal } from "@/components/welcome-to-procal-modal";
import { createInterviewIcs } from "@/lib/calendar-invite";
import { interviewAcceptedEmail } from "@/lib/email-placeholders";
import { sendEmailClient } from "@/lib/send-email-client";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

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
type OnboardingSummary = {
  profileComplete: boolean;
  avatarComplete: boolean;
  photoComplete: boolean;
  cvComplete: boolean;
  idComplete: boolean;
  availabilityComplete: boolean;
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

function proposedSlots(row: InterviewRequestRow): string[] {
  return [row.proposed_slot_1, row.proposed_slot_2, row.proposed_slot_3].filter(
    (slot): slot is string => slot != null && slot.trim() !== "",
  );
}

function TalentWelcomeModalHost() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showWelcomeModal = searchParams.get("welcome") === "1";
  const dismissWelcomeModal = useCallback(() => {
    const path = pathname != null && pathname !== "" ? pathname : "/talent";
    router.replace(path);
  }, [router, pathname]);
  return <WelcomeToProcalModal open={showWelcomeModal} onClose={dismissWelcomeModal} variant="talent" />;
}

function actionableSlots(row: InterviewRequestRow): string[] {
  const s = row.status.toLowerCase();
  if (s === "reschedule_requested") {
    return (row.reschedule_slots ?? []).filter((slot) => slot.trim() !== "");
  }
  if (s === "declined_with_alternatives") {
    return (row.alternative_slots ?? []).filter((slot) => slot.trim() !== "");
  }
  return proposedSlots(row);
}

export default function ConsultantDashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [interviewRows, setInterviewRows] = useState<InterviewRequestRow[] | null>(null);
  const [proposalRows, setProposalRows] = useState<EngagementProposalRow[] | null>(null);
  const [noProfileForEmail, setNoProfileForEmail] = useState(false);
  const [hasUnclaimedProfile, setHasUnclaimedProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interviewFilter, setInterviewFilter] = useState<InterviewStatusFilter>("all");
  const [kindTab, setKindTab] = useState<KindTab>("all");
  const [pendingSlotByInterviewId, setPendingSlotByInterviewId] = useState<Record<string, string>>({});
  const [decisionBusyByInterviewId, setDecisionBusyByInterviewId] = useState<Record<string, boolean>>({});
  const [decisionErrorByInterviewId, setDecisionErrorByInterviewId] = useState<Record<string, string>>({});
  const [declineMessageByInterviewId, setDeclineMessageByInterviewId] = useState<Record<string, string>>({});
  const [altSlotsByInterviewId, setAltSlotsByInterviewId] = useState<Record<string, [string, string, string]>>({});
  const [declinePanelByInterviewId, setDeclinePanelByInterviewId] = useState<Record<string, boolean>>({});
  const [talentName, setTalentName] = useState<string>("");
  const [onboarding, setOnboarding] = useState<OnboardingSummary>({
    profileComplete: false,
    avatarComplete: false,
    photoComplete: false,
    cvComplete: false,
    idComplete: false,
    availabilityComplete: false,
  });

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
    return interviewRows.filter((r) => {
      const s = r.status.toLowerCase();
      if (interviewFilter === "requested") return s === "requested" || s === "reschedule_requested";
      if (interviewFilter === "declined") return s === "declined" || s === "declined_with_alternatives";
      return s === interviewFilter;
    });
  }, [interviewRows, interviewFilter]);

  const showInterviews = kindTab === "all" || kindTab === "interviews";
  const showProposals = kindTab === "all" || kindTab === "proposals";

  const setInterviewDecisionBusy = useCallback((interviewId: string, busy: boolean) => {
    setDecisionBusyByInterviewId((prev) => ({ ...prev, [interviewId]: busy }));
  }, []);

  const acceptInterview = useCallback(
    async (row: InterviewRequestRow, chosenSlot: string) => {
      setInterviewDecisionBusy(row.id, true);
      setDecisionErrorByInterviewId((prev) => ({ ...prev, [row.id]: "" }));
      const { error: updateError } = await supabase
        .from("interview_requests")
        .update({
          status: "accepted",
          selected_slot: chosenSlot,
          decline_message: null,
          alternative_slots: null,
          reschedule_message: null,
          reschedule_slots: null,
        })
        .eq("id", row.id);
      if (updateError != null) {
        setInterviewDecisionBusy(row.id, false);
        setDecisionErrorByInterviewId((prev) => ({
          ...prev,
          [row.id]: updateError.message || "Could not accept interview request.",
        }));
        return;
      }
      setInterviewRows((prev) =>
        prev == null
          ? prev
          : prev.map((item) =>
              item.id === row.id ? { ...item, status: "accepted", selected_slot: chosenSlot } : item,
            ),
      );
      // Best-effort: status update must remain successful even if email sending fails.
      const acceptedEmail = interviewAcceptedEmail({
        companyName: row.company_name,
        consultantName: profileLabel(row.consultant_name),
        selectedSlot: chosenSlot,
      });
      let icsAttachment: { filename: string; content: string } | null = null;
      try {
        const ics = createInterviewIcs({
          title: `Procal interview — ${profileLabel(row.consultant_name)}`,
          description: `Interview confirmed for ${row.company_name}. Requester: ${row.requester_name || "Company contact"}.`,
          start: chosenSlot,
          durationMinutes: 30,
          organizerEmail: "info@procal.co.za",
          attendeeEmail: row.requester_email.trim(),
        });
        icsAttachment = { filename: ics.filename, content: ics.content };
      } catch (icsError) {
        console.error("[talent-dashboard] could not generate interview ics", icsError);
      }
      const acceptedSend = await sendEmailClient({
        to: row.requester_email.trim(),
        subject: acceptedEmail.subject,
        text: `${acceptedEmail.body}\n\nRequester: ${row.requester_name || "Company contact"}\nCompany: ${row.company_name}`,
        ...(icsAttachment != null ? { attachments: [icsAttachment] } : {}),
      });
      if (!acceptedSend.ok) {
        console.error("[talent-dashboard] send-email failed (accepted)", acceptedSend);
      }
      setInterviewDecisionBusy(row.id, false);
      setPendingSlotByInterviewId((prev) => ({ ...prev, [row.id]: chosenSlot }));
    },
    [setInterviewDecisionBusy, supabase],
  );

  const sendAlternativeTimes = useCallback(
    async (row: InterviewRequestRow) => {
      const slots = (altSlotsByInterviewId[row.id] ?? ["", "", ""])
        .map((v) => v.trim())
        .filter((v) => v !== "");
      if (slots.length === 0) {
        setDecisionErrorByInterviewId((prev) => ({ ...prev, [row.id]: "Add at least one alternative time." }));
        return;
      }
      setInterviewDecisionBusy(row.id, true);
      setDecisionErrorByInterviewId((prev) => ({ ...prev, [row.id]: "" }));
      const { error: updateError } = await supabase
        .from("interview_requests")
        .update({
          status: "declined_with_alternatives",
          decline_message: (declineMessageByInterviewId[row.id] ?? "").trim() || null,
          alternative_slots: slots,
        })
        .eq("id", row.id);
      if (updateError != null) {
        setInterviewDecisionBusy(row.id, false);
        setDecisionErrorByInterviewId((prev) => ({
          ...prev,
          [row.id]: updateError.message || "Could not send alternatives.",
        }));
        return;
      }
      setInterviewRows((prev) =>
        prev == null
          ? prev
          : prev.map((item) =>
              item.id === row.id
                ? {
                    ...item,
                    status: "declined_with_alternatives",
                    decline_message: (declineMessageByInterviewId[row.id] ?? "").trim() || null,
                    alternative_slots: slots,
                  }
                : item,
            ),
      );
      setInterviewDecisionBusy(row.id, false);
      setDeclinePanelByInterviewId((prev) => ({ ...prev, [row.id]: false }));
    },
    [altSlotsByInterviewId, declineMessageByInterviewId, setInterviewDecisionBusy, supabase],
  );

  const loadDashboard = useCallback(async (trimmed: string) => {
    setLoading(true);
    setError(null);
    setNoProfileForEmail(false);
    setHasUnclaimedProfile(false);
    setInterviewFilter("all");
    setKindTab("all");
    setPendingSlotByInterviewId({});
    setDecisionBusyByInterviewId({});
    setDecisionErrorByInterviewId({});
    setDeclineMessageByInterviewId({});
    setAltSlotsByInterviewId({});
    setDeclinePanelByInterviewId({});

    const { data: resourceRows, error: resourcesError } = await supabase
      .from("resources")
      .select(
        "id, name, claimed, available_from, headline, bio, hourly_rate, location, industry, resource_type, other_resource_type, avatar_key, profile_photo_path, cv_document_path, id_front_document_path, id_back_document_path",
      )
      .ilike("contact_email", trimmed);

    if (resourcesError) {
      setError(resourcesError.message);
      setInterviewRows(null);
      setProposalRows(null);
      setHasUnclaimedProfile(false);
      setLoading(false);
      return;
    }

    const resources = resourceRows ?? [];
    if (resources.length === 0) {
      setInterviewRows([]);
      setProposalRows([]);
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

    const claimedResource = resources.find((r) => (r as { claimed?: boolean | null }).claimed === true) as
      | {
          id: string;
          name: string | null;
          headline: string | null;
          bio: string | null;
          hourly_rate: number | null;
          location: string | null;
          industry: string | null;
          resource_type: string | null;
          other_resource_type: string | null;
          avatar_key: string | null;
          profile_photo_path: string | null;
          cv_document_path: string | null;
          id_front_document_path: string | null;
          id_back_document_path: string | null;
          available_from: string | null;
        }
      | undefined;
    if (claimedResource) {
      const profileComplete =
        Boolean(claimedResource.name && claimedResource.name.trim() !== "") &&
        Boolean(claimedResource.headline && claimedResource.headline.trim() !== "") &&
        Boolean(claimedResource.bio && claimedResource.bio.trim() !== "") &&
        claimedResource.hourly_rate != null &&
        Boolean(claimedResource.location && claimedResource.location.trim() !== "") &&
        Boolean(claimedResource.industry && claimedResource.industry.trim() !== "") &&
        Boolean(claimedResource.resource_type && claimedResource.resource_type.trim() !== "") &&
        (!(
          claimedResource.industry === "Other" || claimedResource.resource_type === "Other"
        ) || Boolean(claimedResource.other_resource_type && claimedResource.other_resource_type.trim() !== ""));
      const avatarComplete = Boolean(claimedResource.avatar_key && claimedResource.avatar_key.trim() !== "");
      const photoComplete = Boolean(
        claimedResource.profile_photo_path && claimedResource.profile_photo_path.trim() !== "",
      );
      const cvComplete = Boolean(claimedResource.cv_document_path && claimedResource.cv_document_path.trim() !== "");
      const idFrontComplete = Boolean(
        claimedResource.id_front_document_path && claimedResource.id_front_document_path.trim() !== "",
      );
      const idBackComplete = Boolean(
        claimedResource.id_back_document_path && claimedResource.id_back_document_path.trim() !== "",
      );
      setTalentName(claimedResource.name?.trim() ?? "");
      setOnboarding((prev) => ({
        ...prev,
        profileComplete,
        avatarComplete,
        photoComplete,
        cvComplete,
        idComplete: idFrontComplete && idBackComplete,
        availabilityComplete: Boolean(claimedResource.available_from && claimedResource.available_from.trim() !== ""),
      }));
    } else {
      setTalentName("");
      setOnboarding({
        profileComplete: false,
        avatarComplete: false,
        photoComplete: false,
        cvComplete: false,
        idComplete: false,
        availabilityComplete: false,
      });
    }

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
    if (claimedResource != null && nextBlockedByResourceId[claimedResource.id] != null) {
      setOnboarding((prev) => ({ ...prev, availabilityComplete: true }));
    }

    const [irRes, epRes] = await Promise.all([
      supabase
        .from("interview_requests")
        .select(
          "id, resource_id, company_name, requester_name, requester_email, message, proposed_slot_1, proposed_slot_2, proposed_slot_3, selected_slot, decline_message, alternative_slots, reschedule_message, reschedule_slots, status, created_at",
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
              TALENT DASHBOARD
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {talentName !== "" ? `Welcome back, ${talentName}` : "Welcome back"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Manage your profile, availability, and opportunities.
                </p>
              </div>
            </div>
            {!noProfileForEmail ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Setup progress</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/75">
                  {[
                    ["Profile", onboarding.profileComplete],
                    ["Avatar", onboarding.avatarComplete],
                    ["Photo", onboarding.photoComplete],
                    ["CV", onboarding.cvComplete],
                    ["ID", onboarding.idComplete],
                    ["Availability", onboarding.availabilityComplete],
                  ].map(([label, done]) => (
                    <span key={String(label)} className="inline-flex items-center gap-1.5">
                      <span className={done ? "text-emerald-400" : "text-white/35"} aria-hidden>
                        {done ? "✓" : "○"}
                      </span>
                      {label}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-sm text-white/70">
                  Next:{" "}
                  {!onboarding.profileComplete || !onboarding.avatarComplete || !onboarding.photoComplete ? (
                    <Link href="/talent/edit" className="font-semibold text-[#ff6a00] hover:underline">
                      Edit profile
                    </Link>
                  ) : !onboarding.cvComplete || !onboarding.idComplete ? (
                    <Link href="/talent/edit" className="font-semibold text-[#ff6a00] hover:underline">
                      Edit profile
                    </Link>
                  ) : !onboarding.availabilityComplete ? (
                    <Link href="/talent/availability" className="font-semibold text-[#ff6a00] hover:underline">
                      Manage availability
                    </Link>
                  ) : (
                    <a href="#requests-and-proposals" className="font-semibold text-[#ff6a00] hover:underline">
                      Track requests
                    </a>
                  )}
                </div>
              </div>
            ) : null}
            <section className="mt-5 grid gap-3 md:grid-cols-3">
              <Link
                href="/talent/edit"
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#ff6a00]/45 hover:bg-white/[0.08]"
              >
                <p className="text-sm font-semibold text-white">Edit profile</p>
                <p className="mt-1 text-xs text-white/60">
                  Complete your public profile, avatar, photo, CV and ID.
                </p>
              </Link>
              <Link
                href="/talent/availability"
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#ff6a00]/45 hover:bg-white/[0.08]"
              >
                <p className="text-sm font-semibold text-white">Manage availability</p>
                <p className="mt-1 text-xs text-white/60">
                  Set your available-from date and block unavailable days.
                </p>
              </Link>
              <a
                href="#requests-and-proposals"
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#ff6a00]/45 hover:bg-white/[0.08]"
              >
                <p className="text-sm font-semibold text-white">Track requests</p>
                <p className="mt-1 text-xs text-white/60">
                  Review interview requests and engagement proposals.
                </p>
              </a>
            </section>
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
              href="/talent/claim"
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
          </div>
        ) : null}

        {hasLoaded && !noProfileForEmail && !error && !bothEmpty ? (
          <>
            <h2 id="requests-and-proposals" className="text-base font-semibold tracking-tight text-white">
              Requests and proposals
            </h2>
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
                      const normalizedStatus = row.status.toLowerCase();
                      const accepted =
                        normalizedStatus === "accepted" &&
                        row.selected_slot != null &&
                        String(row.selected_slot).trim() !== "";
                      const canRespond = normalizedStatus === "requested" || normalizedStatus === "reschedule_requested";
                      const proposed = actionableSlots(row);
                      const chosenSlot =
                        pendingSlotByInterviewId[row.id] ?? (canRespond ? null : row.selected_slot ?? null);
                      const decisionBusy = decisionBusyByInterviewId[row.id] === true;
                      const decisionError = decisionErrorByInterviewId[row.id];
                      const declinePanelOpen = declinePanelByInterviewId[row.id] === true;
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
                            <h3 className="text-xs font-medium uppercase tracking-wide text-white/45">
                              {normalizedStatus === "reschedule_requested" ? "Reschedule slots" : "Proposed slots"}
                            </h3>
                            <div className="mt-2 grid gap-2 text-sm text-white/85 sm:grid-cols-3">
                              {proposed.length === 0 ? (
                                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-white/55 sm:col-span-3">
                                  No proposed slots were provided.
                                </div>
                              ) : (
                                proposed.map((slot, idx) => {
                                  const selected = chosenSlot != null && chosenSlot === slot;
                                  return (
                                    <button
                                      key={`${row.id}-${slot}-${idx}`}
                                      type="button"
                                      disabled={!canRespond || decisionBusy}
                                      onClick={() => {
                                        if (!canRespond || decisionBusy) return;
                                        setPendingSlotByInterviewId((prev) => ({ ...prev, [row.id]: slot }));
                                      }}
                                      className={`rounded-lg border px-3 py-2 text-left transition ${
                                        selected
                                          ? "border-orange-500 bg-orange-500/10"
                                          : "border-white/10 bg-white/[0.04] hover:border-white/20"
                                      } ${!canRespond ? "cursor-default" : ""}`}
                                    >
                                      <span className="text-xs text-white/45">Slot {idx + 1}</span>
                                      <p className="font-medium">{formatSlot(slot)}</p>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            {canRespond ? (
                              <p className="mt-2 text-xs text-white/60">
                                Select one time to accept the interview.
                              </p>
                            ) : null}
                            {normalizedStatus === "reschedule_requested" && row.reschedule_message?.trim() ? (
                              <p className="mt-2 text-xs text-amber-200/90">Company message: {row.reschedule_message}</p>
                            ) : null}
                            {normalizedStatus === "declined_with_alternatives" && row.decline_message?.trim() ? (
                              <p className="mt-2 text-xs text-amber-200/90">Your message: {row.decline_message}</p>
                            ) : null}
                          </div>

                          {canRespond ? (
                            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-end">
                              <button
                                type="button"
                                disabled={decisionBusy || chosenSlot == null}
                                onClick={() => {
                                  if (chosenSlot == null || decisionBusy) return;
                                  void acceptInterview(row, chosenSlot);
                                }}
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#ff6a00] px-4 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {decisionBusy ? "Saving..." : normalizedStatus === "reschedule_requested" ? "Accept reschedule slot" : "Accept selected slot"}
                              </button>
                              <button
                                type="button"
                                disabled={decisionBusy}
                                onClick={() => {
                                  if (decisionBusy) return;
                                  setDeclinePanelByInterviewId((prev) => ({ ...prev, [row.id]: !declinePanelOpen }));
                                }}
                                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-4 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {declinePanelOpen ? "Cancel" : "Decline with alternatives"}
                              </button>
                            </div>
                          ) : null}
                          {canRespond && declinePanelOpen ? (
                            <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
                              <label className="block text-xs font-medium uppercase tracking-wide text-white/45">
                                Message
                                <textarea
                                  rows={2}
                                  value={declineMessageByInterviewId[row.id] ?? ""}
                                  onChange={(e) =>
                                    setDeclineMessageByInterviewId((prev) => ({ ...prev, [row.id]: e.target.value }))
                                  }
                                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40"
                                  placeholder="Share a short note with the company."
                                />
                              </label>
                              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                {[0, 1, 2].map((idx) => (
                                  <input
                                    key={`${row.id}-alt-${idx}`}
                                    type="datetime-local"
                                    value={(altSlotsByInterviewId[row.id] ?? ["", "", ""])[idx] ?? ""}
                                    onChange={(e) =>
                                      setAltSlotsByInterviewId((prev) => {
                                        const current = [...(prev[row.id] ?? ["", "", ""])] as [string, string, string];
                                        current[idx] = e.target.value;
                                        return { ...prev, [row.id]: current };
                                      })
                                    }
                                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-orange-500/40"
                                  />
                                ))}
                              </div>
                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  disabled={decisionBusy}
                                  onClick={() => void sendAlternativeTimes(row)}
                                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff6a00] px-3 text-xs font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
                                >
                                  Send alternative times
                                </button>
                              </div>
                            </div>
                          ) : null}
                          {decisionError ? <p className="mt-3 text-sm text-red-300">{decisionError}</p> : null}

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
      <Suspense fallback={null}>
        <TalentWelcomeModalHost />
      </Suspense>
    </>
  );
}
