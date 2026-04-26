"use client";

import { signOut } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

type NavRole = "company" | "consultant" | "admin";

function navLinkClass(active: boolean) {
  if (active) {
    return "rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white ring-1 ring-[#ff6a00]/50 transition-colors";
  }
  return "rounded-md px-2.5 py-1.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white";
}

function navDivider() {
  return <span className="mx-1 hidden h-5 w-px bg-white/20 sm:inline-block" aria-hidden />;
}

export type AppTopNavVariant = "default" | "hero";

export function AppTopNav({ variant = "default" }: { variant?: AppTopNavVariant }) {
  const pathname = usePathname() ?? "";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [navRole, setNavRole] = useState<NavRole | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadRoleForUser(userId: string) {
      const { data, error } = await supabase.from("user_profiles").select("role").eq("id", userId).maybeSingle();
      if (cancelled) return;
      if (error != null || data == null) {
        setNavRole(null);
        return;
      }
      const r = (data as { role: string }).role;
      if (r === "company" || r === "consultant" || r === "admin") {
        setNavRole(r);
      } else {
        setNavRole(null);
      }
    }

    async function syncSession(session: { user: User } | null) {
      const user = session?.user ?? null;
      setAuthUser(user);
      if (user == null) {
        setNavRole(undefined);
        return;
      }
      setNavRole(undefined);
      await loadRoleForUser(user.id);
    }

    void supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const marketplaceActive =
    pathname === "/marketplace" || pathname.startsWith("/consultants");
  const companyDashboardActive = pathname === "/company";
  const talentDashboardActive =
    pathname === "/talent" ||
    pathname.startsWith("/talent/") ||
    pathname === "/consultant" ||
    pathname.startsWith("/consultant/");
  const adminResourcesActive = pathname.startsWith("/admin/resources");
  const adminInterviewsActive = pathname.startsWith("/admin/interviews");
  const adminEngagementsActive = pathname.startsWith("/admin/engagements");
  const loginActive = pathname === "/login";
  const signupActive = pathname === "/signup";

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B0B0D]"
      data-nav-variant={variant}
    >
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3.5 md:flex-row md:items-center md:justify-between md:px-8 md:py-4">
        <Link
          href="/"
          className="mr-8 flex shrink-0 items-center self-start bg-transparent transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-0 md:self-center"
          aria-label="Procal home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- transparent PNG logo; avoid optimizer background quirks */}
          <img
            src="/logo.png"
            alt="Procal logo"
            width={200}
            height={56}
            className="h-7 w-auto max-h-7 object-contain md:h-8 md:max-h-8"
            decoding="async"
            fetchPriority="high"
          />
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-2 md:justify-end">
          <Link href="/marketplace" className={navLinkClass(marketplaceActive)}>
            Marketplace
          </Link>

          {authUser == null ? (
            <>
              {navDivider()}
              <Link href="/login" className={navLinkClass(loginActive)}>
                Log in
              </Link>
              <Link href="/signup" className={navLinkClass(signupActive)}>
                Sign up
              </Link>
            </>
          ) : null}

          {authUser != null && navRole === "company" ? (
            <Link href="/company?section=engagements" className={navLinkClass(companyDashboardActive)}>
              Company Dashboard
            </Link>
          ) : null}

          {authUser != null && navRole === "consultant" ? (
            <Link href="/talent" className={navLinkClass(talentDashboardActive)}>
              Talent Dashboard
            </Link>
          ) : null}

          {authUser != null && navRole === "admin" ? (
            <>
              <Link href="/admin/resources" className={navLinkClass(adminResourcesActive)}>
                Admin
              </Link>
              <Link href="/admin/interviews" className={navLinkClass(adminInterviewsActive)}>
                Interviews
              </Link>
              <Link href="/admin/engagements" className={navLinkClass(adminEngagementsActive)}>
                Engagements
              </Link>
            </>
          ) : null}

          {authUser != null ? (
            <>
              {navDivider()}
              <div className="relative group">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
                  >
                    Log out
                  </button>
                </form>
                <span
                  className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#111] px-3 py-1.5 text-xs text-gray-300 opacity-0 shadow-lg transition duration-200 group-hover:opacity-100"
                  title={authUser.email ?? ""}
                >
                  {authUser.email}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
