"use client";

import { postLoginRedirectPath } from "@/lib/auth-routing";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

const ACCENT = "#ff6a00";

/** Same hero asset as landing (Unsplash). */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1659177444041-94305594457e?auto=format&fit=crop&w=2400&q=88";

const inputClass =
  "min-w-0 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/25";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

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

  const modalClass =
    "relative w-full max-w-md min-w-0 rounded-3xl border border-white/10 bg-[#111111]/95 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-10";

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

      <div className="pointer-events-none fixed inset-0 z-[1] bg-black/70 backdrop-blur-md" aria-hidden />

      <div className="relative z-10 flex min-h-screen min-h-dvh items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className={modalClass}>
          <Link
            href="/"
            className="absolute right-3 top-3 rounded-lg p-2 text-zinc-500 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </Link>

          <div className="mb-7 flex flex-col items-center gap-3 pt-2">
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

          <h1 className="text-center text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl">
            Welcome back
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-zinc-400 md:text-base">
            Log in to continue to ProCal
          </p>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-7 flex min-w-0 flex-col gap-5"
          >
            {error ? (
              <p className="rounded-xl border border-red-500/35 bg-red-950/50 px-4 py-3 text-sm leading-snug text-red-100">
                {error}
              </p>
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
                placeholder="you@company.com"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium text-zinc-400">Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-md transition duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
              style={{ backgroundColor: ACCENT }}
            >
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-white/60">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold underline-offset-4 transition hover:underline"
              style={{ color: ACCENT }}
            >
              Sign up
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
        </div>
      </div>
    </div>
  );
}
