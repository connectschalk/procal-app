"use client";

import { InterviewSlotPicker, slotsToProposedColumns } from "@/components/interview-slot-picker";
import { interviewRequestSubmittedEmail } from "@/lib/email-placeholders";
import { sendEmailClient } from "@/lib/send-email-client";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function InterviewRequestForm({
  resourceId,
  consultantName,
}: {
  resourceId: string;
  consultantName: string;
}) {
  const [companyName, setCompanyName] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pickedSlots, setPickedSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSlotsError(null);
    setSuccess(false);
    setSubmitting(true);

    if (pickedSlots.length === 0) {
      setSlotsError("Select at least one interview time.");
      setSubmitting(false);
      return;
    }

    const { proposed_slot_1, proposed_slot_2, proposed_slot_3 } = slotsToProposedColumns(pickedSlots);

    const { error: insertError } = await supabase.from("interview_requests").insert([
      {
        resource_id: resourceId,
        company_name: companyName,
        requester_name: requesterName,
        requester_email: requesterEmail,
        message: message.trim() || null,
        proposed_slot_1,
        proposed_slot_2,
        proposed_slot_3,
        status: "requested",
      },
    ]);

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Best-effort MVP: notify requester by email; DB insert already succeeded.
    const companyForEmail = companyName.trim() || "there";
    const requesterTo = requesterEmail.trim();
    const submittedPreview = interviewRequestSubmittedEmail({
      companyName: companyForEmail,
    });
    const sendResult = await sendEmailClient({
      to: requesterTo,
      subject: submittedPreview.subject,
      text: submittedPreview.body,
    });
    if (!sendResult.ok) {
      console.log(
        "EMAIL PREVIEW - REQUEST SUBMITTED (send failed, fallback)",
        submittedPreview.subject,
        submittedPreview.body,
        sendResult.error,
      );
    }

    setSuccess(true);
    setCompanyName("");
    setRequesterName("");
    setRequesterEmail("");
    setMessage("");
    setPickedSlots([]);
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 md:p-8">
        <p className="text-base font-medium text-emerald-950">
          Interview request submitted. The consultant will review your proposed slots.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/company"
            className="inline-flex items-center justify-center rounded-full border border-orange-300 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-950 hover:bg-orange-100"
          >
            Track my request
          </Link>
          <Link
            href={`/consultants/${resourceId}`}
            className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
          >
            Back to profile
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Marketplace
          </Link>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-emerald-900/70">
          Use the same email address you submitted with to open your company dashboard.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600">
        Requesting interview with <span className="font-medium text-zinc-900">{consultantName}</span>
      </p>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800">Company name</span>
        <input
          required
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800">Your name</span>
        <input
          required
          type="text"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800">Work email</span>
        <input
          required
          type="email"
          value={requesterEmail}
          onChange={(e) => setRequesterEmail(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800">Message</span>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Context for the interview, role, or timeline"
          className="resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
        />
      </label>

      <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-5 shadow-sm shadow-zinc-950/[0.03] md:p-6">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-950">Choose interview times</h2>
          <p className="text-xs leading-relaxed text-zinc-600">
            Pick a date, then tap up to three 30-minute slots. Times use your device timezone.
          </p>
        </div>
        <div className="mt-5">
          <InterviewSlotPicker
            selectedSlots={pickedSlots}
            onChange={(next) => {
              setPickedSlots(next);
              setSlotsError(null);
            }}
          />
        </div>
        {slotsError ? <p className="mt-3 text-sm text-red-600">{slotsError}</p> : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
        <Link
          href={`/consultants/${resourceId}`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
