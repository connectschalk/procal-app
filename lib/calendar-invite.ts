/**
 * Minimal iCalendar (RFC 5545) text for a single interview block.
 * Intended for future email attachment via Brevo; not wired to send yet.
 */

export type CreateInterviewIcsInput = {
  title: string;
  description: string;
  /** Wall time from DB (ISO string) or Date */
  start: string | Date;
  /** Defaults to 30 */
  durationMinutes?: number;
  organizerEmail: string;
  attendeeEmail: string;
};

function formatIcsUtc(d: Date): string {
  const iso = d.toISOString();
  const noMs = iso.replace(/\.\d{3}Z$/, "Z");
  return noMs.replace(/[-:]/g, "");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function newUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${crypto.randomUUID()}@procal.co.za`;
  }
  return `procal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@procal.co.za`;
}

export function createInterviewIcs(input: CreateInterviewIcsInput): {
  filename: string;
  content: string;
} {
  const durationMinutes = input.durationMinutes ?? 30;
  const start = typeof input.start === "string" ? new Date(input.start) : input.start;
  if (Number.isNaN(start.getTime())) {
    throw new Error("createInterviewIcs: invalid start");
  }
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const uid = newUid();
  const dtstamp = formatIcsUtc(new Date());
  const dtstart = formatIcsUtc(start);
  const dtend = formatIcsUtc(end);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Procal//Interview//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    `ORGANIZER:mailto:${input.organizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${input.attendeeEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return {
    filename: "procal-interview.ics",
    content: lines.join("\r\n") + "\r\n",
  };
}
