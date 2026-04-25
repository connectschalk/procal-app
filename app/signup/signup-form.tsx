"use client";

import { dashboardPathForRole } from "@/lib/auth-routing";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

export type SignupRole = "company" | "consultant";

const ACCENT = "#ff6a00";

/** Same hero asset as landing (Unsplash). */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1659177444041-94305594457e?auto=format&fit=crop&w=2400&q=88";

const modalCardClass =
  "relative w-full max-w-md min-w-0 rounded-3xl border border-white/10 bg-[#0b0f1a]/90 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-10";

const inputClass =
  "min-w-0 rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/25";

const roleCardClass =
  "group cursor-pointer rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-center shadow-sm shadow-black/20 backdrop-blur-sm transition duration-200 hover:border-white/15 hover:bg-black/35 has-[:checked]:border-orange-500/70 has-[:checked]:bg-orange-950/35 has-[:checked]:shadow-md has-[:checked]:shadow-orange-950/20 has-[:checked]:ring-2 has-[:checked]:ring-orange-500/35";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

export function SignupForm({ initialRole }: { initialRole: SignupRole }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isTalentSignup = initialRole === "consultant";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signErr != null) {
      setError(signErr.message);
      setBusy(false);
      return;
    }

    if (data.user == null) {
      setError("Sign up did not return a user.");
      setBusy(false);
      return;
    }

    if (data.session == null) {
      setPendingConfirmationEmail(email.trim());
      setBusy(false);
      return;
    }

    const trimmedEmail = email.trim();
    const { error: insertErr } = await supabase.from("user_profiles").insert({
      id: data.user.id,
      email: trimmedEmail,
      role,
    });

    if (insertErr != null && insertErr.code !== "23505") {
      setError(insertErr.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    router.push(dashboardPathForRole(role));
    router.refresh();
  }

  return (
    <div className="relative min-h-screen min-h-dvh overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed auth backdrop */}
        <img
          src={HERO_IMAGE}
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-zinc-950/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-zinc-950/75 to-black" />
        <div
          className="absolute -top-24 left-1/2 h-[min(45vh,22rem)] w-[min(120%,40rem)] -translate-x-1/2 rounded-full opacity-80 blur-3xl"
          style={{
            background: `radial-gradient(closest-side, rgba(255,106,0,0.12), transparent 70%)`,
          }}
        />
      </div>

      <div className="pointer-events-none fixed inset-0 z-[1] bg-black/60 backdrop-blur-md" aria-hidden />

      <div className="relative z-10 flex min-h-screen min-h-dvh items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className={modalCardClass}>
          <Link
            href="/"
            className="absolute right-3 top-3 rounded-lg p-2 text-zinc-500 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </Link>

          <div className="mb-6 flex flex-col items-center gap-3 pt-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold tracking-tight text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #ea580c 100%)` }}
              aria-hidden
            >
              P
            </div>
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/70 sm:text-[11px]">
              PROCAL
            </span>
          </div>

          {pendingConfirmationEmail != null ? (
            <>
              <h1 className="text-center text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
                Check your email. Once confirmed, we&apos;ll take you to your ProCal dashboard.
              </h1>
              <p className="mt-5 break-all text-center text-sm font-medium text-white/70">
                {pendingConfirmationEmail}
              </p>
              <div className="mt-7 flex flex-col items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex w-full max-w-xs items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-md transition duration-200 hover:brightness-105"
                  style={{ backgroundColor: ACCENT }}
                >
                  Back to login
                </Link>
              </div>
              <p className="mt-6 text-center">
                <Link
                  href="/"
                  className="text-sm text-white/60 underline-offset-4 transition hover:text-white/80 hover:underline"
                >
                  ← Back to home
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
                {isTalentSignup ? "Create your Talent account" : "Create your ProCal account"}
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-white/60 md:text-base">
                {isTalentSignup
                  ? "List your services and start receiving opportunities"
                  : "Choose how you want to use ProCal"}
              </p>

              <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex min-w-0 flex-col gap-4">
                {error ? (
                  <p className="rounded-xl border border-red-500/35 bg-red-950/50 px-4 py-3 text-sm leading-snug text-red-100">
                    {error}
                  </p>
                ) : null}

                {!isTalentSignup ? (
                  <fieldset className="flex min-w-0 flex-col gap-2.5">
                    <legend className="text-center text-xs font-semibold uppercase tracking-widest text-white/50">
                      I am signing up as
                    </legend>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className={roleCardClass}>
                        <input
                          type="radio"
                          name="role"
                          value="company"
                          checked={role === "company"}
                          onChange={() => setRole("company")}
                          className="sr-only"
                        />
                        <span className="block text-base font-semibold text-white">Company</span>
                        <span className="mt-1 block text-xs text-white/55">Hire talent</span>
                      </label>
                      <label className={roleCardClass}>
                        <input
                          type="radio"
                          name="role"
                          value="consultant"
                          checked={role === "consultant"}
                          onChange={() => setRole("consultant")}
                          className="sr-only"
                        />
                        <span className="block text-base font-semibold text-white">Talent</span>
                        <span className="mt-1 block text-xs text-white/55">List your services</span>
                      </label>
                    </div>
                  </fieldset>
                ) : null}

                <label className="flex min-w-0 flex-col gap-2 text-sm">
                  <span className="font-medium text-zinc-400">Email</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-sm">
                  <span className="font-medium text-zinc-400">Password</span>
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                  <span className="text-xs text-white/45">
                    At least 6 characters (your Supabase project may require more).
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-md transition duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
                  style={{ backgroundColor: ACCENT }}
                >
                  {busy ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-white/60">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold underline-offset-4 transition hover:underline"
                  style={{ color: ACCENT }}
                >
                  Log in
                </Link>
              </p>

              <p className="mt-5 text-center">
                <Link
                  href="/"
                  className="text-sm text-white/60 underline-offset-4 transition hover:text-white/80 hover:underline"
                >
                  ← Back to home
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
