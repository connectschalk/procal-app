"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Step = "email" | "code" | "done";

export default function ConsultantClaimPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      const em = user?.email?.trim() ?? "";
      setEmail(em);
      if (!em) {
        setError("Your account has no email address. Add an email to your Procal login before claiming a profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const trimmed = email.trim();
    const res = await fetch("/api/send-claim-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
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
      setError(typeof data.error === "string" && data.error.trim() !== "" ? data.error : "Something went wrong");
      return;
    }
    setStep("code");
  }

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/verify-claim-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
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
      setError(typeof data.error === "string" && data.error.trim() !== "" ? data.error : "Something went wrong");
      return;
    }
    setStep("done");
  }

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Claim your profile</h1>
          <p className="text-sm leading-relaxed text-zinc-600">
            Verify the email on your talent profile. We&apos;ll send a one-time code to complete the claim.
          </p>
        </header>

        {step === "email" ? (
          <form
            onSubmit={(e) => void handleSendCode(e)}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 md:p-6"
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-800">Profile contact email</span>
              <input
                required
                readOnly
                type="email"
                value={email}
                autoComplete="email"
                placeholder="you@example.com"
                className="cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-zinc-700 outline-none ring-zinc-950"
              />
              <span className="text-xs text-zinc-500">Codes are sent only to your signed-in email.</span>
            </label>
            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting || email.trim() === ""}
              className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : null}

        {step === "code" ? (
          <form
            onSubmit={(e) => void handleVerify(e)}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 md:p-6"
          >
            <p className="text-sm text-zinc-600">
              Enter the 6-digit code sent to <span className="font-medium text-zinc-900">{email.trim()}</span>.
            </p>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-800">Verification code</span>
              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-lg tracking-widest text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
              />
            </label>
            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
              >
                {submitting ? "Verifying…" : "Verify and claim"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Back
              </button>
            </div>
          </form>
        ) : null}

        {step === "done" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 md:p-8">
            <p className="text-base font-medium text-emerald-950">Profile claimed successfully</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/consultant"
                className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Open talent dashboard
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
              >
                Marketplace
              </Link>
            </div>
          </div>
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
