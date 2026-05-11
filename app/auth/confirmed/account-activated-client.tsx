"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { ProcalPasswordLoginForm } from "@/components/procal-password-login-form";
import { resolvePostActivationPath } from "@/lib/post-activation-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const ACCENT = "#ff6a00";

const glassCard =
  "rounded-3xl border border-white/10 bg-white/5 p-8 shadow-lg shadow-black/25 backdrop-blur-md md:p-10";

export function AccountActivatedClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [phase, setPhase] = useState<"boot" | "exchanging" | "ready">("boot");
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(true);
  const [continueBusy, setContinueBusy] = useState(false);

  useEffect(() => {
    if (phase === "ready") {
      setDialogOpen(true);
    }
  }, [phase]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (code != null && code.trim() !== "") {
        setPhase("exchanging");
        setExchangeError(null);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error != null) {
          setExchangeError(error.message);
          setHasSession(false);
          setPhase("ready");
          return;
        }
        router.replace("/auth/confirmed");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(session != null);
      setPhase("ready");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [code, router, supabase]);

  const handleContinue = useCallback(async () => {
    setContinueBusy(true);
    try {
      const path = await resolvePostActivationPath(supabase);
      router.push(path);
      router.refresh();
    } finally {
      setContinueBusy(false);
    }
  }, [router, supabase]);

  const pageBody =
    phase === "boot" || phase === "exchanging"
      ? "Just a moment while we connect your account."
      : hasSession
        ? "Your account has been activated. Continue to complete your Procal profile."
        : "Your account has been activated. Log in to complete your Procal profile.";

  const modalClass =
    "relative z-[201] w-full max-w-md min-w-0 rounded-3xl border border-white/10 bg-[#111111]/95 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-10";

  return (
    <div className="relative min-h-screen min-h-dvh overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-24 left-1/2 h-[min(50vh,26rem)] w-[min(130%,44rem)] -translate-x-1/2 rounded-full opacity-90 blur-3xl"
          style={{
            background: `radial-gradient(closest-side, rgba(255,106,0,0.12), transparent 72%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-black" />
      </div>

      <AppTopNav variant="hero" />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pb-24 pt-10 sm:px-6 md:px-10 md:pt-14">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ff6a00] md:text-[11px]">ProCal</p>
        <div className={glassCard}>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Account activated</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">{pageBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {phase === "ready" ? (
              hasSession ? (
                <button
                  type="button"
                  disabled={continueBusy}
                  onClick={() => void handleContinue()}
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-55"
                  style={{ backgroundColor: ACCENT }}
                >
                  {continueBusy ? "Continuing…" : "Continue to Procal"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
                  style={{ backgroundColor: ACCENT }}
                >
                  Log in to continue
                </button>
              )
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>

      {dialogOpen ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Dismiss dialog"
            onClick={() => setDialogOpen(false)}
          />
          <div className={modalClass} role="dialog" aria-modal="true" aria-labelledby="auth-confirmed-dialog-title">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-2 text-zinc-500 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
              onClick={() => setDialogOpen(false)}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>

            <div className="mb-6 flex flex-col items-center gap-2 pt-1">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #ea580c 100%)` }}
                aria-hidden
              >
                P
              </div>
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/65">ProCal</span>
            </div>

            {phase === "boot" || phase === "exchanging" ? (
              <>
                <h2 id="auth-confirmed-dialog-title" className="text-center text-lg font-semibold text-white">
                  {phase === "boot" ? "Loading…" : "Confirming your account"}
                </h2>
                <p className="mt-3 text-center text-sm text-zinc-400">Please wait…</p>
              </>
            ) : exchangeError != null ? (
              <>
                <h2 id="auth-confirmed-dialog-title" className="text-center text-lg font-semibold text-white">
                  Could not confirm link
                </h2>
                <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                  {exchangeError}
                </p>
                <Link
                  href="/login"
                  className="mt-5 block w-full rounded-2xl py-3 text-center text-sm font-semibold text-white transition hover:brightness-105"
                  style={{ backgroundColor: ACCENT }}
                >
                  Go to log in
                </Link>
              </>
            ) : hasSession ? (
              <>
                <h2 id="auth-confirmed-dialog-title" className="text-center text-lg font-semibold text-white">
                  Account activated
                </h2>
                <p className="mt-3 text-center text-sm leading-relaxed text-zinc-400">
                  You&apos;re signed in. Continue to your dashboard or profile setup.
                </p>
                <button
                  type="button"
                  disabled={continueBusy}
                  onClick={() => void handleContinue()}
                  className="mt-6 w-full rounded-2xl py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:opacity-55"
                  style={{ backgroundColor: ACCENT }}
                >
                  {continueBusy ? "Continuing…" : "Continue to Procal"}
                </button>
              </>
            ) : (
              <div className="pt-1">
                <h2 id="auth-confirmed-dialog-title" className="sr-only">
                  Log in to continue
                </h2>
                <ProcalPasswordLoginForm
                  heading="Log in to continue"
                  subheading="Your account has been activated. Log in to complete your Procal profile."
                  submitLabel="Log in to continue"
                  showSignUpLink={false}
                  resolveDestination={async () => resolvePostActivationPath(supabase)}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {phase === "ready" && !dialogOpen ? (
        <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-[90] flex justify-center px-4 sm:pointer-events-auto">
          <button
            type="button"
            disabled={hasSession && continueBusy}
            onClick={() => {
              if (hasSession) {
                void handleContinue();
              } else {
                setDialogOpen(true);
              }
            }}
            className="pointer-events-auto rounded-full border border-white/15 bg-black/80 px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/90 disabled:opacity-55"
            style={{ boxShadow: `0 0 0 1px rgba(255,106,0,0.2)` }}
          >
            {hasSession ? (continueBusy ? "Continuing…" : "Continue to Procal") : "Log in to continue"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
