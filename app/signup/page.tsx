"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { dashboardPathForRole } from "@/lib/auth-routing";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type SignupRole = "company" | "consultant";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("company");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    const { data, error: signErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role },
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
      setInfo(
        "Check your email to confirm your account if required. After confirming, log in — your profile is created when you sign up (including from the database trigger if configured).",
      );
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
    <div className="relative flex min-h-screen flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-slate-950/70" aria-hidden />

      <div className="relative z-20">
        <AppTopNav />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 md:px-8 md:py-16">
        <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-10">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold tracking-tight text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
              aria-hidden
            >
              P
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Procal</span>
          </div>

          <h1 className="text-center text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
            Create your ProCal account
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-white/70 md:text-base">
            Choose how you want to use ProCal
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 flex flex-col gap-5">
            {error ? (
              <p className="rounded-xl border border-red-400/30 bg-red-950/50 px-4 py-3 text-sm leading-snug text-red-100">
                {error}
              </p>
            ) : null}
            {info ? (
              <p className="rounded-xl border border-amber-400/25 bg-amber-950/40 px-4 py-3 text-sm leading-snug text-amber-50">
                {info}
              </p>
            ) : null}

            <fieldset className="flex flex-col gap-3">
              <legend className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                I am signing up as
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="group cursor-pointer rounded-2xl border border-white/12 bg-white/5 px-4 py-4 text-center transition hover:border-white/20 hover:bg-white/10 has-[:checked]:border-orange-400/45 has-[:checked]:bg-orange-600/20 has-[:checked]:shadow-md has-[:checked]:shadow-orange-950/20">
                  <input
                    type="radio"
                    name="role"
                    value="company"
                    checked={role === "company"}
                    onChange={() => setRole("company")}
                    className="sr-only"
                  />
                  <span className="block text-base font-semibold text-white">Company</span>
                  <span className="mt-1 block text-xs text-white/55">Hire consultants</span>
                </label>
                <label className="group cursor-pointer rounded-2xl border border-white/12 bg-white/5 px-4 py-4 text-center transition hover:border-white/20 hover:bg-white/10 has-[:checked]:border-orange-400/45 has-[:checked]:bg-orange-600/20 has-[:checked]:shadow-md has-[:checked]:shadow-orange-950/20">
                  <input
                    type="radio"
                    name="role"
                    value="consultant"
                    checked={role === "consultant"}
                    onChange={() => setRole("consultant")}
                    className="sr-only"
                  />
                  <span className="block text-base font-semibold text-white">Consultant</span>
                  <span className="mt-1 block text-xs text-white/55">Offer your expertise</span>
                </label>
              </div>
            </fieldset>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-white/90">Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-orange-400/50 focus:bg-white/10 focus:ring-2 focus:ring-orange-500/30"
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-white/90">Password</span>
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-orange-400/50 focus:bg-white/10 focus:ring-2 focus:ring-orange-500/30"
                placeholder="••••••••"
              />
              <span className="text-xs text-white/45">
                At least 6 characters (your Supabase project may require more).
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/30 transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-orange-300 underline-offset-4 transition hover:text-orange-200 hover:underline"
            >
              Log in
            </Link>
          </p>

          <p className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-white/50 underline-offset-4 transition hover:text-white/85 hover:underline"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
