"use client";

import {
  engagementProposalNotifyConsultantEmail,
  engagementProposalSubmittedEmail,
} from "@/lib/email-placeholders";
import { sendEmailClient } from "@/lib/send-email-client";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function EngagementProposalForm({
  resourceId,
  consultantName,
}: {
  resourceId: string;
  consultantName: string;
}) {
  const [companyName, setCompanyName] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [proposedStartDate, setProposedStartDate] = useState("");
  const [proposedEndDate, setProposedEndDate] = useState("");
  const [scope, setScope] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const rateTrim = proposedRate.trim();
    let proposed_rate: number | null = null;
    if (rateTrim !== "") {
      const n = Number(rateTrim);
      if (!Number.isFinite(n) || n < 0) {
        setError("Proposed rate must be a valid non-negative number.");
        setSubmitting(false);
        return;
      }
      proposed_rate = n;
    }

    const { error: insertError } = await supabase.from("engagement_proposals").insert([
      {
        resource_id: resourceId,
        company_name: companyName.trim(),
        requester_name: requesterName.trim(),
        requester_email: requesterEmail.trim(),
        proposed_start_date: proposedStartDate.trim() || null,
        proposed_end_date: proposedEndDate.trim() || null,
        scope: scope.trim() || null,
        proposed_rate,
        status: "proposed",
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

    const companyForEmail = companyName.trim() || "there";
    const requesterTo = requesterEmail.trim();
    const submittedPreview = engagementProposalSubmittedEmail({
      companyName: companyForEmail,
      consultantName: consultantNameForEmail,
    });
    const sendResult = await sendEmailClient({
      to: requesterTo,
      subject: submittedPreview.subject,
      text: submittedPreview.body,
    });
    if (!sendResult.ok) {
      console.error("[engagement-proposal-form] send-email failed", sendResult);
      console.log(
        "EMAIL PREVIEW - ENGAGEMENT PROPOSAL SUBMITTED (send failed, fallback)",
        submittedPreview.subject,
        submittedPreview.body,
      );
    }

    const consultantTo = (resourceContact?.contact_email as string | null | undefined)?.trim();
    if (consultantTo) {
      const consultantPreview = engagementProposalNotifyConsultantEmail({
        consultantName: consultantNameForEmail,
        companyName: companyForEmail,
        requesterName: requesterName.trim(),
        scope: scope.trim() || null,
        proposedRate: proposed_rate,
      });
      const consultantSend = await sendEmailClient({
        to: consultantTo,
        subject: consultantPreview.subject,
        text: consultantPreview.body,
      });
      if (!consultantSend.ok) {
        console.error("[engagement-proposal-form] consultant send-email failed", consultantSend);
        console.log(
          "EMAIL PREVIEW - ENGAGEMENT NOTIFY CONSULTANT (send failed, fallback)",
          consultantPreview.subject,
          consultantPreview.body,
        );
      }
    } else {
      console.warn(
        "[engagement-proposal-form] No consultant contact_email for resource; skipping notify",
        resourceId,
      );
    }

    setSuccess(true);
    setCompanyName("");
    setRequesterName("");
    setRequesterEmail("");
    setProposedStartDate("");
    setProposedEndDate("");
    setScope("");
    setProposedRate("");
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 md:p-8">
        <p className="text-base font-medium text-emerald-950">Engagement proposal submitted.</p>
        <div className="mt-6 flex flex-wrap gap-3">
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
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600">
        Proposing engagement with{" "}
        <span className="font-medium text-zinc-900">{consultantName}</span>
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

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800">Proposed start date</span>
          <input
            type="date"
            value={proposedStartDate}
            onChange={(e) => setProposedStartDate(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800">Proposed end date</span>
          <input
            type="date"
            value={proposedEndDate}
            onChange={(e) => setProposedEndDate(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800">Scope</span>
        <textarea
          rows={4}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="Deliverables, duration expectations, or context"
          className="resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800">Proposed rate (optional)</span>
        <input
          type="text"
          inputMode="decimal"
          value={proposedRate}
          onChange={(e) => setProposedRate(e.target.value)}
          placeholder="e.g. 1500 (ZAR per hour or as agreed)"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit proposal"}
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
