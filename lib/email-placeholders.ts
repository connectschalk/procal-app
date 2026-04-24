/**
 * Plain-text email subject/body builders for interview and engagement workflows.
 * No sending — wire to Resend (or similar) at the call sites (forms / admin clients).
 */

function formatSelectedSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatSlotFromIsoNullable(iso: string | null): string | null {
  if (iso == null || String(iso).trim() === "") return null;
  return formatSelectedSlot(iso);
}

export type InterviewRequestNotifyConsultantEmailInput = {
  /** Consultant display name from resources.name */
  consultantName: string;
  companyName: string;
  requesterName: string;
  message: string | null;
  proposed_slot_1: string | null;
  proposed_slot_2: string | null;
  proposed_slot_3: string | null;
};

/** Plain text for the consultant when a company submits an interview request. */
export function interviewRequestNotifyConsultantEmail(
  input: InterviewRequestNotifyConsultantEmailInput,
): { subject: string; body: string } {
  const subject = "New interview request for you on Procal";
  const greet = input.consultantName.trim() || "there";
  const msg = input.message?.trim() ? input.message.trim() : "—";
  const slotLines: string[] = [];
  const o1 = formatSlotFromIsoNullable(input.proposed_slot_1);
  const o2 = formatSlotFromIsoNullable(input.proposed_slot_2);
  const o3 = formatSlotFromIsoNullable(input.proposed_slot_3);
  if (o1) slotLines.push(`Option 1: ${o1}`);
  if (o2) slotLines.push(`Option 2: ${o2}`);
  if (o3) slotLines.push(`Option 3: ${o3}`);
  const slotsBlock = slotLines.length > 0 ? slotLines.join("\n") : "—";

  const body = [
    `Hi ${greet},`,
    "",
    "You have received a new interview request on Procal.",
    "",
    `Company: ${input.companyName}`,
    `Contact: ${input.requesterName}`,
    "",
    "Message:",
    msg,
    "",
    "Proposed interview times:",
    slotsBlock,
    "",
    "Log in to Procal to review and respond to this request.",
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

export type InterviewRequestSubmittedEmailInput = {
  /** Company name from the interview request */
  companyName: string;
  /** Consultant display name (e.g. resources.name); empty → "the consultant" in copy */
  consultantName: string;
};

/**
 * @future Call after a successful `interview_requests` insert (e.g. from the
 * interview request form submit handler or a server action / API route).
 */
export function interviewRequestSubmittedEmail(
  input: InterviewRequestSubmittedEmailInput,
): { subject: string; body: string } {
  const consultantRef = input.consultantName.trim() ? input.consultantName.trim() : "the consultant";
  const subject = "Interview request received";
  const body = [
    `Hi ${input.companyName},`,
    "",
    `Thank you for your interview request with ${consultantRef}.`,
    "",
    "Your request is under review. We will notify you when there is an update.",
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

export type InterviewAcceptedEmailInput = {
  companyName: string;
  /** Display name from resources (admin); empty → "the consultant" in copy */
  consultantName: string;
  /** ISO string from `interview_requests.selected_slot` (timestamptz) */
  selectedSlot: string;
};

/**
 * @future Call after an admin accepts a request (status `accepted` and
 * `selected_slot` set), e.g. next to the Supabase update in admin interviews.
 */
export function interviewAcceptedEmail(
  input: InterviewAcceptedEmailInput,
): { subject: string; body: string } {
  const when = formatSelectedSlot(input.selectedSlot);
  const consultantRef = input.consultantName.trim() ? input.consultantName.trim() : "the consultant";
  const subject = "Interview request accepted";
  const body = [
    `Hi ${input.companyName},`,
    "",
    `Your interview request with ${consultantRef} has been accepted.`,
    "",
    `Calendar invite support is being prepared. Confirmed time: ${when}.`,
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

export type InterviewDeclinedEmailInput = {
  companyName: string;
  /** Display name from resources (admin); empty → "the consultant" in copy */
  consultantName: string;
};

/**
 * @future Call after an admin declines a request (status `declined`), e.g.
 * next to the Supabase update in admin interviews.
 */
export function interviewDeclinedEmail(
  input: InterviewDeclinedEmailInput,
): { subject: string; body: string } {
  const consultantRef = input.consultantName.trim() ? input.consultantName.trim() : "the consultant";
  const subject = "Interview request update";
  const body = [
    `Hi ${input.companyName},`,
    "",
    `Your interview request with ${consultantRef} was not accepted at this time.`,
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

function formatEngagementRateZar(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(rate);
}

export type EngagementProposalSubmittedEmailInput = {
  companyName: string;
  /** Consultant display name; empty → "the consultant" in copy */
  consultantName: string;
};

export function engagementProposalSubmittedEmail(
  input: EngagementProposalSubmittedEmailInput,
): { subject: string; body: string } {
  const consultantRef = input.consultantName.trim() ? input.consultantName.trim() : "the consultant";
  const subject = "Engagement proposal received";
  const body = [
    `Thank you for your engagement proposal with ${consultantRef}.`,
    "",
    "We will notify you once there is an update.",
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

export type EngagementProposalNotifyConsultantEmailInput = {
  consultantName: string;
  companyName: string;
  requesterName: string;
  scope: string | null;
  proposedRate: number | null;
};

export function engagementProposalNotifyConsultantEmail(
  input: EngagementProposalNotifyConsultantEmailInput,
): { subject: string; body: string } {
  const subject = "New engagement proposal on Procal";
  const greet = input.consultantName.trim() ? input.consultantName.trim() : "there";
  const scopeBlock = input.scope?.trim() ? input.scope.trim() : "—";
  const rateBlock = formatEngagementRateZar(input.proposedRate);

  const body = [
    `Hi ${greet},`,
    "",
    "You have received a new engagement proposal.",
    "",
    `Company: ${input.companyName}`,
    `Contact: ${input.requesterName}`,
    "",
    "Scope:",
    scopeBlock,
    "",
    "Proposed rate:",
    rateBlock,
    "",
    "Log in to Procal to review and respond to this proposal.",
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

export type EngagementProposalAcceptedEmailInput = {
  companyName: string;
  /** Display name from resources; empty → "the consultant" in copy */
  consultantName: string;
};

export function engagementProposalAcceptedEmail(
  input: EngagementProposalAcceptedEmailInput,
): { subject: string; body: string } {
  const consultantRef = input.consultantName.trim() ? input.consultantName.trim() : "the consultant";
  const subject = "Engagement proposal accepted";
  const body = [
    `Hi ${input.companyName},`,
    "",
    `Your engagement proposal with ${consultantRef} has been accepted.`,
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

export type EngagementProposalDeclinedEmailInput = {
  companyName: string;
  /** Display name from resources; empty → "the consultant" in copy */
  consultantName: string;
};

export function engagementProposalDeclinedEmail(
  input: EngagementProposalDeclinedEmailInput,
): { subject: string; body: string } {
  const consultantRef = input.consultantName.trim() ? input.consultantName.trim() : "the consultant";
  const subject = "Engagement proposal update";
  const body = [
    `Hi ${input.companyName},`,
    "",
    `Your engagement proposal with ${consultantRef} was not accepted at this time.`,
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}
