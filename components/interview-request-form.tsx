"use client";

import { InterviewSlotPicker, slotsToProposedColumns } from "@/components/interview-slot-picker";
import {
  interviewRequestNotifyConsultantEmail,
  interviewRequestSubmittedEmail,
} from "@/lib/email-placeholders";
import { sendEmailClient } from "@/lib/send-email-client";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useState, type FormEvent } from "react";

const ACCENT = "#ff6a00";

const glassCard =
  "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/25 backdrop-blur-md md:p-8";
const inputClass =
  "min-w-0 rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/25";

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

    const { data: resourceContact } = await supabase
      .from("resources")
      .select("contact_email, name")
      .eq("id", resourceId)
      .maybeSingle();

    const resourceNameRaw = resourceContact?.name as string | null | undefined;
    const consultantNameForEmail =
      resourceNameRaw?.trim() || consultantName.trim() || "";

    // Best-effort MVP: notify requester by email; DB insert already succeeded.
    const companyForEmail = companyName.trim() || "there";
    const requesterTo = requesterEmail.trim();
    const submittedPreview = interviewRequestSubmittedEmail({
      companyName: companyForEmail,
      consultantName: consultantNameForEmail,
    });
    const sendResult = await sendEmailClient({
      to: requesterTo,
      subject: submittedPreview.subject,
      text: submittedPreview.body,
    });
    if (!sendResult.ok) {
      console.error("[interview-request-form] send-email failed", sendResult);
      console.log(
        "EMAIL PREVIEW - REQUEST SUBMITTED (send failed, fallback)",
        submittedPreview.subject,
        submittedPreview.body,
      );
    }

    // Best-effort MVP: notify consultant if resources.contact_email is set (not shown publicly).
    const consultantTo = (resourceContact?.contact_email as string | null | undefined)?.trim();
    if (consultantTo) {
      const consultantPreview = interviewRequestNotifyConsultantEmail({
        consultantName: consultantNameForEmail,
        companyName: companyForEmail,
        requesterName: requesterName.trim(),
        message: message.trim() || null,
        proposed_slot_1,
        proposed_slot_2,
        proposed_slot_3,
      });
      const consultantSend = await sendEmailClient({
        to: consultantTo,
        subject: consultantPreview.subject,
        text: consultantPreview.body,
      });
      if (!consultantSend.ok) {
        console.error("[interview-request-form] consultant send-email failed", consultantSend);
      }
    } else {
      console.warn("[interview-request-form] No consultant contact_email for resource; skipping notify", resourceId);
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
      <div className={`${glassCard} border-emerald-500/25 bg-emerald-950/20`}>
        <p className="text-base font-semibold text-emerald-100">Request sent</p>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          {consultantName} will review your proposed times. You’ll receive a confirmation once the talent responds.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/company"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            style={{ backgroundColor: ACCENT }}
          >
            Track my request
          </Link>
          <Link
            href={`/consultants/${resourceId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/15 bg-black/30 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/45"
          >
            Back to profile
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/12 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:text-white"
          >
            Marketplace
          </Link>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-white/45">
          Use the same email address you submitted with to open your company dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className={glassCard}>
      <header className="border-b border-white/10 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">Request an interview</h2>
        <p className="mt-1.5 text-sm text-white/55">Choose a time that works for you</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <div>
          <InterviewSlotPicker
            variant="booking"
            resourceId={resourceId}
            selectedSlots={pickedSlots}
            onChange={(next) => {
              setPickedSlots(next);
              setSlotsError(null);
            }}
          />
          {slotsError ? (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
              {slotsError}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 border-t border-white/10 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Contact details</p>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-white/55">Company</span>
            <input
              required
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
              autoComplete="organization"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-white/55">Your name</span>
            <input
              required
              type="text"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              className={inputClass}
              autoComplete="name"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-white/55">Work email</span>
            <input
              required
              type="email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-white/55">Add a message (optional)</span>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Role, timeline, or context for the interview"
            className={`${inputClass} resize-y`}
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {submitting ? "Submitting…" : "Request interview"}
          </button>
          <Link
            href={`/consultants/${resourceId}`}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-white/15 bg-black/25 px-6 text-sm font-semibold text-white/85 backdrop-blur-sm transition hover:bg-black/40"
          >
            Cancel
          </Link>
        </div>
        <p className="text-center text-xs leading-relaxed text-white/45 sm:text-left">
          You’ll receive a confirmation once the talent responds.
        </p>
      </form>
    </div>
  );
}
