"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { dashboardPathForRole } from "@/lib/auth-routing";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signErr != null) {
      setError(signErr.message);
      setBusy(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user == null) {
      setError("Could not load session.");
      setBusy(false);
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr != null || profile == null) {
      setError(
        "Your account has no profile row yet. If you just signed up, wait a moment and try again, or run 014_auth_profiles_roles.sql in Supabase.",
      );
      setBusy(false);
      return;
    }

    const role = (profile as { role: string }).role;
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
            Welcome back
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-white/70 md:text-base">
            Log in to continue to ProCal
          </p>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-8 flex flex-col gap-5"
          >
            {error ? (
              <p className="rounded-xl border border-red-400/30 bg-red-950/50 px-4 py-3 text-sm leading-snug text-red-100">
                {error}
              </p>
            ) : null}

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-white/90">Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none ring-0 transition focus:border-orange-400/50 focus:bg-white/10 focus:ring-2 focus:ring-orange-500/30"
                placeholder="you@company.com"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-white/90">Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none transition focus:border-orange-400/50 focus:bg-white/10 focus:ring-2 focus:ring-orange-500/30"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/30 transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/60">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-orange-300 underline-offset-4 transition hover:text-orange-200 hover:underline"
            >
              Sign up
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
