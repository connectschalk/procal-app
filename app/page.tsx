"use client";

import { AppTopNav } from "@/components/app-top-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

const ACCENT = "#ff6a00";

/**
 * Hero art: https://unsplash.com/photos/a-group-of-toy-figures-rg1gOP6RC4s
 * Unsplash (license: Unsplash). Bad CDN paths return 404 with no image.
 */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1659177444041-94305594457e?auto=format&fit=crop&w=2400&q=88";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SearchIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 20l-4.35-4.35" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 21a8 8 0 0116 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 3v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarketingHeader() {
  const linkClass =
    "text-sm font-medium text-white/80 transition-colors duration-200 hover:text-white whitespace-nowrap";
  return (
    <header className="relative z-20 border-b border-white/[0.08] bg-black/15 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 md:px-10 md:py-4">
        <div className="grid grid-cols-[1fr_auto] items-center gap-y-2 gap-x-3 md:grid-cols-[auto_1fr_auto] md:gap-x-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3 justify-self-start transition-opacity duration-200 hover:opacity-90"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm sm:h-9 sm:w-9"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #ea580c 100%)` }}
              aria-hidden
            >
              P
            </div>
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/95 sm:text-[11px]">
              PROCAL
            </span>
          </Link>

          <nav
            className="col-span-2 flex justify-center gap-6 overflow-x-auto pb-0.5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] md:col-span-1 md:gap-7 md:overflow-visible lg:gap-9 [&::-webkit-scrollbar]:hidden"
            aria-label="Primary"
          >
            <Link href="/marketplace" className={linkClass}>
              Marketplace
            </Link>
            <Link href="/#how-it-works" className={linkClass}>
              How it works
            </Link>
            <Link href="/#pricing" className={linkClass}>
              Pricing
            </Link>
            <Link href="/#about" className={linkClass}>
              About
            </Link>
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-3 justify-self-end md:col-start-3 md:row-start-1">
            <Link
              href="/login"
              className="text-sm font-medium text-white/85 transition-colors duration-200 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl border border-[#ff6a00] bg-[#ff6a00]/10 px-4 py-2 text-sm font-semibold text-[#ff6a00] transition-all duration-200 hover:bg-[#ff6a00]/18"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function HomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setAuthUser(data.session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const ctaBase =
    "group inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60 sm:w-auto sm:min-w-[14.5rem]";
  const primaryBtnClass = `${ctaBase} text-white shadow-md shadow-black/25 hover:brightness-[1.06] active:brightness-[0.98]`;
  const secondaryBtnClass = `${ctaBase} border border-white/[0.14] bg-black/40 text-white/90 backdrop-blur-md hover:border-white/25 hover:bg-black/50 hover:text-white`;

  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed hero; remote URL validated */}
        <img
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full min-h-full w-full min-w-full object-cover object-center"
          decoding="async"
          fetchPriority="high"
        />
      </div>
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50"
        aria-hidden
      />

      {authUser != null ? <AppTopNav variant="hero" /> : <MarketingHeader />}

      <main className="relative z-10 flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-4 text-center sm:px-6 sm:pb-14 sm:pt-6 md:px-10 md:pb-16 md:pt-8">
          <p
            className="text-[10px] font-medium uppercase tracking-widest sm:text-[11px]"
            style={{ color: ACCENT }}
          >
            CONNECT. COLLABORATE. GROW.
          </p>

          <h1 className="mt-2.5 max-w-[20rem] text-balance text-3xl font-extrabold leading-[0.98] tracking-tight text-white sm:mt-3 sm:max-w-xl sm:text-4xl md:max-w-2xl md:text-5xl">
            Find talent.
            <br />
            Grow{" "}
            <span className="font-extrabold" style={{ color: ACCENT }}>
              your
            </span>{" "}
            business.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-white/70 sm:text-base">
            ProCal connects companies with verified professionals
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            so you can get work done — and grow faster.
          </p>

          <div className="mt-7 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/marketplace"
              className={primaryBtnClass}
              style={{ backgroundColor: ACCENT }}
            >
              I&apos;m looking for talent
              <ArrowRightIcon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/signup?role=consultant" className={secondaryBtnClass}>
              I&apos;m offering skills
              <ArrowRightIcon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-5 w-full max-w-2xl rounded-2xl border border-white/10 bg-black/30 p-5 shadow-lg shadow-black/25 backdrop-blur-md sm:max-w-3xl sm:p-6 md:rounded-3xl">
            <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-8">
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.12]"
                  aria-hidden
                >
                  <SearchIcon className="h-5 w-5" style={{ color: ACCENT }} />
                </div>
                <h2 className="mt-3 text-base font-semibold tracking-tight text-white sm:text-lg">
                  Find the right talent
                </h2>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/65 sm:max-w-[17rem] sm:text-sm">
                  Search verified professionals and find the perfect fit for your project.
                </p>
              </div>
              <div className="flex flex-col items-center border-t border-white/[0.08] pt-6 text-center md:border-l md:border-t-0 md:pl-8 md:pt-0 md:items-start md:text-left">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.12]"
                  aria-hidden
                >
                  <UserIcon className="h-5 w-5" style={{ color: ACCENT }} />
                </div>
                <h2 className="mt-3 text-base font-semibold tracking-tight text-white sm:text-lg">
                  Showcase your skills
                </h2>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/65 sm:max-w-[17rem] sm:text-sm">
                  Create your profile, get discovered and grow your opportunities.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/75">
            <ShieldCheckIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" style={{ color: ACCENT }} />
            <span>Verified professionals. Trusted by companies.</span>
          </div>

          <div className="mt-8 flex max-w-md flex-col items-center gap-2 text-center">
            <Link
              href="/login?next=/company"
              className="text-sm text-white/55 underline-offset-4 transition-colors hover:text-white/90 hover:underline"
            >
              Already requested talent? Open your company dashboard
            </Link>
            <Link
              href="/login?next=/consultant"
              className="text-sm text-white/55 underline-offset-4 transition-colors hover:text-white/90 hover:underline"
            >
              Already listed? Open your talent dashboard
            </Link>
          </div>
        </section>

        <section
          id="how-it-works"
          className="relative z-10 border-t border-white/10 bg-zinc-950/95 px-4 py-16 text-white sm:px-6 md:px-10"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-white/70">
              Companies browse the marketplace and request interviews. Talent builds a profile, sets
              availability, and responds to opportunities — all in one place.
            </p>
          </div>
        </section>

        <section id="pricing" className="relative z-10 border-t border-white/5 bg-zinc-900/90 px-4 py-16 text-white sm:px-6 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight">Pricing</h2>
            <p className="mt-3 text-white/70">
              ProCal is built for clarity as you scale engagements. Contact us for a tailored plan that
              matches how your team hires and works with external professionals.
            </p>
          </div>
        </section>

        <section id="about" className="relative z-10 border-t border-white/5 bg-zinc-950 px-4 py-16 text-white sm:px-6 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight">About ProCal</h2>
            <p className="mt-3 text-white/70">
              We connect verified professionals with companies that need serious work done — with less
              friction and more trust from first search to signed engagement.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
