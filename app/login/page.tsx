"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { postLoginRedirectPath } from "@/lib/auth-routing";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

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
    const nextRaw =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;
    const nextFromUrl =
      nextRaw != null && nextRaw.trim() !== "" ? nextRaw.trim() : null;
    setBusy(false);
    router.push(postLoginRedirectPath(role, nextFromUrl));
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-200">
      <div className="relative z-20 border-b border-zinc-300/80 bg-white/90 backdrop-blur-sm">
        <AppTopNav />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 md:px-8 md:py-14">
        <div
          className="w-full max-w-md rounded-3xl border border-zinc-700/50 p-8 shadow-2xl shadow-zinc-950/30 md:p-10"
          style={{ backgroundColor: "#0b0f1a" }}
        >
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

          <h1 className="text-center text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
            Welcome back
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-zinc-400 md:text-base">
            Log in to continue to ProCal
          </p>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-8 flex min-w-0 flex-col gap-5"
          >
            {error ? (
              <p className="rounded-xl border border-red-500/35 bg-red-950/50 px-4 py-3 text-sm leading-snug text-red-100">
                {error}
              </p>
            ) : null}

            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium text-zinc-300">Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 rounded-xl border border-zinc-600/60 bg-zinc-900/50 px-4 py-3 text-zinc-100 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/25"
                placeholder="you@company.com"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium text-zinc-300">Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-w-0 rounded-xl border border-zinc-600/60 bg-zinc-900/50 px-4 py-3 text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/25"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:from-orange-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-orange-400 underline-offset-4 transition hover:text-orange-300 hover:underline"
            >
              Sign up
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
        </div>
      </main>
    </div>
  );
}
