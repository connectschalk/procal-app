"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const STORAGE_KEY = "procal.consultantEmail";

export default function ConsultantEditProfilePage() {
  const [email, setEmail] = useState("");
  const [dashboardEmail, setDashboardEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const [notClaimed, setNotClaimed] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [location, setLocation] = useState("");

  const loadProfile = useCallback(async (trimmed: string) => {
    setEmail(trimmed);
    setLoading(true);
    setError(null);
    setNoProfile(false);
    setAmbiguous(false);
    setNotClaimed(false);
    setCanEdit(false);
    setSuccess(false);

    const { data, error: fetchError } = await supabase
      .from("resources")
      .select("name, headline, bio, hourly_rate, location, claimed")
      .ilike("contact_email", trimmed);

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      setDashboardEmail(null);
      return;
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      setNoProfile(true);
      setDashboardEmail(trimmed);
      return;
    }
    if (rows.length > 1) {
      setAmbiguous(true);
      setDashboardEmail(trimmed);
      return;
    }

    const row = rows[0] as {
      name: string | null;
      headline: string | null;
      bio: string | null;
      hourly_rate: number | null;
      location: string | null;
      claimed: boolean | null;
    };

    setDashboardEmail(trimmed);

    if (row.claimed !== true) {
      setNotClaimed(true);
      return;
    }

    setCanEdit(true);
    setName((row.name as string | null) ?? "");
    setHeadline((row.headline as string | null) ?? "");
    setBio((row.bio as string | null) ?? "");
    setLocation((row.location as string | null) ?? "");
    const rate = row.hourly_rate;
    setHourlyRate(rate != null && Number.isFinite(Number(rate)) ? String(rate) : "");
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const trimmed = stored?.trim();
      if (trimmed) {
        queueMicrotask(() => {
          void loadProfile(trimmed);
        });
      }
    } catch {
      /* ignore */
    }
  }, [loadProfile]);

  async function handleLoadEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
    await loadProfile(trimmed);
  }

  function handleChangeEmail() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setEmail("");
    setDashboardEmail(null);
    setError(null);
    setNoProfile(false);
    setAmbiguous(false);
    setNotClaimed(false);
    setCanEdit(false);
    setSuccess(false);
  }

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dashboardEmail?.trim()) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const rateTrim = hourlyRate.trim();
    let hourly_rate: number | null = null;
    if (rateTrim !== "") {
      const n = Number(rateTrim);
      if (!Number.isFinite(n) || n < 0) {
        setError("Hourly rate must be a valid non-negative number.");
        setSubmitting(false);
        return;
      }
      hourly_rate = n;
    }

    const res = await fetch("/api/update-consultant-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: dashboardEmail.trim(),
        name: name.trim(),
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        hourly_rate,
        location: location.trim() || null,
      }),
    });

    const raw = await res.text();
    let data: { success?: boolean; error?: string } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      /* ignore */
    }
    setSubmitting(false);

    if (!res.ok || data.success !== true) {
      setError(typeof data.error === "string" && data.error.trim() !== "" ? data.error : "Update failed");
      return;
    }

    setSuccess(true);
  }

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">Edit profile</h1>
              <p className="text-sm leading-relaxed text-zinc-600">
                Enter the contact email on your claimed Procal profile to update how you appear on the marketplace.
              </p>
            </div>
            {dashboardEmail != null ? (
              <button
                type="button"
                onClick={handleChangeEmail}
                className="shrink-0 self-start text-sm font-medium text-orange-700 underline-offset-2 hover:underline"
              >
                Change email
              </button>
            ) : null}
          </div>
          {dashboardEmail != null ? (
            <p className="text-xs text-zinc-500">Editing as: {dashboardEmail}</p>
          ) : null}
        </header>

        <form
          onSubmit={handleLoadEmail}
          className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 md:flex-row md:items-end md:gap-4 md:p-6"
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-800">Profile contact email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              disabled={canEdit}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
            />
          </label>
          {!canEdit ? (
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? "Loading…" : "Continue"}
            </button>
          ) : null}
        </form>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {noProfile ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            No talent profile found for this email.
          </p>
        ) : null}

        {ambiguous ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Multiple profiles match this email. Contact support to update your profile.
          </p>
        ) : null}

        {notClaimed ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-5 py-5 md:px-6">
            <p className="text-sm font-medium text-zinc-900">Please claim your profile first</p>
            <p className="mt-2 text-sm text-zinc-600">
              After you verify your email, you can return here to edit your public profile details.
            </p>
            <Link
              href="/consultant/claim"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Claim profile
            </Link>
          </div>
        ) : null}

        {canEdit && success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 md:p-8">
            <p className="text-base font-medium text-emerald-950">Profile updated</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/consultant"
                className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Back to dashboard
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
              >
                View marketplace
              </Link>
            </div>
          </div>
        ) : null}

        {canEdit && !success ? (
          <form onSubmit={(e) => void handleSaveProfile(e)} className="flex flex-col gap-6">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-800">Name</span>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-800">Headline</span>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Short professional tagline"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-800">Bio</span>
              <textarea
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="How you help clients"
                className="resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-800">Hourly rate (optional)</span>
              <input
                type="text"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="e.g. 1500"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-800">Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City or region"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save profile"}
              </button>
              <Link
                href="/consultant"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : null}

        <p className="text-center text-xs text-zinc-500">
          <Link href="/consultant" className="font-medium text-orange-700 underline-offset-2 hover:underline">
            ← Talent Dashboard
          </Link>
        </p>
      </main>
    </>
  );
}
