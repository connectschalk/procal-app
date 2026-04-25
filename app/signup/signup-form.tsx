"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { dashboardPathForRole } from "@/lib/auth-routing";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

export type SignupRole = "company" | "consultant";

const modalCardClass =
  "w-full max-w-md rounded-3xl border border-zinc-700/50 p-8 shadow-2xl shadow-zinc-950/30 md:p-10 min-w-0";
const modalCardStyle = { backgroundColor: "#0b0f1a" as const };

const roleCardClass =
  "group cursor-pointer rounded-2xl border border-zinc-600/50 bg-zinc-900/60 px-4 py-4 text-center shadow-sm shadow-black/20 transition hover:border-zinc-500/70 hover:bg-zinc-900/80 has-[:checked]:border-orange-500 has-[:checked]:bg-orange-950/40 has-[:checked]:shadow-md has-[:checked]:shadow-orange-950/25 has-[:checked]:ring-2 has-[:checked]:ring-orange-500/35";

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
    <div className="flex min-h-screen flex-col bg-zinc-200">
      <div className="relative z-20 border-b border-zinc-300/80 bg-white/90 backdrop-blur-sm">
        <AppTopNav />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 md:px-8 md:py-14">
        <div className={modalCardClass} style={modalCardStyle}>
          <div className="mb-8 flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold tracking-tight text-white shadow-lg shadow-orange-950/30"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
              aria-hidden
            >
              P
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-400">
              PROCAL
            </span>
          </div>

          {pendingConfirmationEmail != null ? (
            <>
              <h1 className="text-center text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
                Check your email. Once confirmed, we&apos;ll take you to your ProCal dashboard.
              </h1>
              <p className="mt-6 break-all text-center text-sm font-medium text-zinc-300">
                {pendingConfirmationEmail}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex w-full max-w-xs items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:from-orange-400 hover:to-orange-500"
                >
                  Back to login
                </Link>
              </div>
              <p className="mt-8 text-center">
                <Link
                  href="/"
                  className="text-sm text-zinc-600 underline-offset-4 transition hover:text-zinc-800 hover:underline"
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
              <p className="mt-3 text-center text-sm leading-relaxed text-zinc-400 md:text-base">
                {isTalentSignup
                  ? "List your services and start receiving opportunities"
                  : "Choose how you want to use ProCal"}
              </p>

              <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 flex min-w-0 flex-col gap-5">
                {error ? (
                  <p className="rounded-xl border border-red-500/35 bg-red-950/50 px-4 py-3 text-sm leading-snug text-red-100">
                    {error}
                  </p>
                ) : null}

                {!isTalentSignup ? (
                  <fieldset className="flex min-w-0 flex-col gap-3">
                    <legend className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
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
                        <span className="mt-1 block text-xs text-zinc-400">Hire talent</span>
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
                        <span className="mt-1 block text-xs text-zinc-400">List your services</span>
                      </label>
                    </div>
                  </fieldset>
                ) : null}

                <label className="flex min-w-0 flex-col gap-2 text-sm">
                  <span className="font-medium text-zinc-300">Email</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-w-0 rounded-xl border border-zinc-600/60 bg-zinc-900/50 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/25"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-sm">
                  <span className="font-medium text-zinc-300">Password</span>
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-w-0 rounded-xl border border-zinc-600/60 bg-zinc-900/50 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/25"
                    placeholder="••••••••"
                  />
                  <span className="text-xs text-zinc-500">
                    At least 6 characters (your Supabase project may require more).
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {busy ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-orange-400 underline-offset-4 transition hover:text-orange-300 hover:underline"
                >
                  Log in
                </Link>
              </p>

              <p className="mt-6 text-center">
                <Link
                  href="/"
                  className="text-sm text-zinc-600 underline-offset-4 transition hover:text-zinc-800 hover:underline"
                >
                  ← Back to home
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
