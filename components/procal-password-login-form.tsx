"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

const ACCENT = "#ff6a00";

const inputClass =
  "min-w-0 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/25";

export type ProcalPasswordLoginFormProps = {
  /** Called after a successful sign-in once the destination path is known. */
  resolveDestination: () => Promise<string>;
  onBusyChange?: (busy: boolean) => void;
  heading: string;
  subheading: string;
  submitLabel?: string;
  /** When false, hides the sign-up link (e.g. activation modal). */
  showSignUpLink?: boolean;
};

export function ProcalPasswordLoginForm({
  resolveDestination,
  onBusyChange,
  heading,
  subheading,
  submitLabel = "Log in",
  showSignUpLink = true,
}: ProcalPasswordLoginFormProps) {
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
    onBusyChange?.(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signErr != null) {
      setError(signErr.message);
      setBusy(false);
      onBusyChange?.(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user == null) {
      setError("Could not load session.");
      setBusy(false);
      onBusyChange?.(false);
      return;
    }

    try {
      const destination = await resolveDestination();
      setBusy(false);
      onBusyChange?.(false);
      router.push(destination);
      router.refresh();
    } catch {
      setError("Could not continue after login. Please try again.");
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <div className="min-w-0">
      <h2 className="text-center text-xl font-bold leading-tight tracking-tight text-white md:text-2xl">{heading}</h2>
      <p className="mt-2 text-center text-sm leading-relaxed text-zinc-400 md:text-[15px]">{subheading}</p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex min-w-0 flex-col gap-4">
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
          {busy ? "Logging in…" : submitLabel}
        </button>
      </form>

      {showSignUpLink ? (
        <p className="mt-6 text-center text-sm text-white/60">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold underline-offset-4 transition hover:underline"
            style={{ color: ACCENT }}
          >
            Sign up
          </Link>
        </p>
      ) : null}
    </div>
  );
}
