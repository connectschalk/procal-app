"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function CreateConsultantPage() {
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      setError("Name is required.");
      setSubmitting(false);
      return;
    }

    const contactTrimmed = contactEmail.trim();
    if (!contactTrimmed) {
      setError("Notification email is required.");
      setSubmitting(false);
      return;
    }

    const hourly_rate = Number(hourlyRate);
    const years_experience = Number.parseInt(yearsExperience, 10);

    const { error: insertError } = await supabase.from("resources").insert([
      {
        name: nameTrimmed,
        headline,
        location,
        hourly_rate,
        years_experience,
        bio,
        contact_email: contactTrimmed,
        profile_status: "draft",
      },
    ]);

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess(true);
    setName("");
    setHeadline("");
    setLocation("");
    setHourlyRate("");
    setYearsExperience("");
    setBio("");
    setContactEmail("");
  }

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Create Consultant Profile
          </h1>
        </header>

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <p className="font-medium">Profile submitted for review</p>
          <p className="mt-2 text-emerald-800/90">
            Your profile was saved as a draft. It will appear on the marketplace after approval.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
            >
              Add another
            </button>
            <Link
              href="/marketplace"
              className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              View marketplace
            </Link>
          </div>
        </div>
      ) : null}

      {!success ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-800">Name</span>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-800">Notification email</span>
            <input
              required
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              autoComplete="email"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
            />
            <span className="text-xs text-zinc-500">
              Used only to email you about new interview requests. Not shown on your public profile.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-800">Headline</span>
            <input
              required
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-800">Location</span>
            <input
              required
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
            />
          </label>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-zinc-800">Hourly rate (ZAR)</span>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-zinc-800">Years of experience</span>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-zinc-800">Bio</span>
            <textarea
              required
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="resize-y rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Submit profile"}
          </button>
        </form>
      ) : null}
      </main>
    </>
  );
}
