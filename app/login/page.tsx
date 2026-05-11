"use client";

import { ProcalPasswordLoginForm } from "@/components/procal-password-login-form";
import { resolveLoginRedirectPath } from "@/lib/post-activation-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";

const ACCENT = "#ff6a00";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1659177444041-94305594457e?auto=format&fit=crop&w=2400&q=88";

const modalClass =
  "relative w-full max-w-md min-w-0 rounded-3xl border border-white/10 bg-[#111111]/95 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-10";

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

function LoginWithNextParam() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const nextFromUrl = nextRaw != null && nextRaw.trim() !== "" ? nextRaw.trim() : null;

  return (
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
        <span className="text-[10px] font-medium uppercase tracking-widest text-white/70 sm:text-[11px]">PROCAL</span>
      </div>

      <ProcalPasswordLoginForm
        heading="Welcome back"
        subheading="Log in to continue to ProCal"
        resolveDestination={async () => resolveLoginRedirectPath(supabase, nextFromUrl)}
      />

      <p className="mt-5 text-center">
        <Link
          href="/"
          className="text-sm text-white/60 underline-offset-4 transition hover:text-white/80 hover:underline"
        >
          ← Back to home
        </Link>
      </p>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className={modalClass}>
      <div className="mb-7 flex flex-col items-center gap-3 pt-2">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold tracking-tight text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #ea580c 100%)` }}
          aria-hidden
        >
          P
        </div>
        <span className="text-[10px] font-medium uppercase tracking-widest text-white/70 sm:text-[11px]">PROCAL</span>
      </div>
      <p className="text-center text-sm text-zinc-400">Loading…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen min-h-dvh overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed auth backdrop */}
        <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover object-center" />
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
        <Suspense fallback={<LoginFallback />}>
          <LoginWithNextParam />
        </Suspense>
      </div>
    </div>
  );
}
