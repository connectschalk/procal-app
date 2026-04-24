/**
 * Plain-text email subject/body builders for the interview workflow.
 * No sending — wire to Resend (or similar) later at the call sites noted below.
 */

function formatSelectedSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export type InterviewRequestSubmittedEmailInput = {
  /** Company name from the interview request */
  companyName: string;
};

/**
 * @future Call after a successful `interview_requests` insert (e.g. from the
 * interview request form submit handler or a server action / API route).
 */
export function interviewRequestSubmittedEmail(
  input: InterviewRequestSubmittedEmailInput,
): { subject: string; body: string } {
  const subject = "Interview request received";
  const body = [
    `Hi ${input.companyName},`,
    "",
    "Thank you for your interview request.",
    "",
    "Your request is under review. We will notify you when there is an update.",
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

export type InterviewAcceptedEmailInput = {
  companyName: string;
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
  const subject = "Interview request accepted";
  const body = [
    `Hi ${input.companyName},`,
    "",
    "Your interview request has been accepted.",
    "",
    `Confirmed time: ${when}`,
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}

export type InterviewDeclinedEmailInput = {
  companyName: string;
};

/**
 * @future Call after an admin declines a request (status `declined`), e.g.
 * next to the Supabase update in admin interviews.
 */
export function interviewDeclinedEmail(
  input: InterviewDeclinedEmailInput,
): { subject: string; body: string } {
  const subject = "Interview request update";
  const body = [
    `Hi ${input.companyName},`,
    "",
    "Thank you for your interest. Your interview request was not accepted on this occasion.",
    "",
    "— Procal",
  ].join("\n");

  return { subject, body };
}
