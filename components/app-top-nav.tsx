"use client";

import { signOut } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

type NavRole = "company" | "consultant" | "admin";

function navLinkClass(active: boolean, hero: boolean) {
  if (hero) {
    if (active) {
      return "rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-semibold text-white ring-1 ring-[#ff6a00]/50 transition-colors";
    }
    return "rounded-md px-2.5 py-1.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white";
  }
  if (active) {
    return "rounded-md bg-orange-50/90 px-2.5 py-1.5 text-sm font-semibold text-orange-700 ring-1 ring-orange-200/80 transition-colors";
  }
  return "rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900";
}

function navDivider(hero: boolean) {
  return (
    <span
      className={`mx-1 hidden h-5 w-px sm:inline-block ${hero ? "bg-white/20" : "bg-zinc-200"}`}
      aria-hidden
    />
  );
}

export type AppTopNavVariant = "default" | "hero";

export function AppTopNav({ variant = "default" }: { variant?: AppTopNavVariant }) {
  const pathname = usePathname() ?? "";
  const hero = variant === "hero";
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
  const talentDashboardActive = pathname === "/consultant" || pathname.startsWith("/consultant/");
  const adminResourcesActive = pathname.startsWith("/admin/resources");
  const adminInterviewsActive = pathname.startsWith("/admin/interviews");
  const adminEngagementsActive = pathname.startsWith("/admin/engagements");
  const loginActive = pathname === "/login";
  const signupActive = pathname === "/signup";

  return (
    <header
      className={
        hero
          ? "sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-md"
          : "sticky top-0 z-50 border-b border-zinc-200 bg-white"
      }
    >
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3.5 md:flex-row md:items-center md:justify-between md:px-10 md:py-4">
        {hero ? (
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #ff6a00 0%, #ea580c 100%)" }}
              aria-hidden
            >
              P
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white">PROCAL</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-zinc-950 transition-colors hover:text-orange-600"
          >
            Procal
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <Link href="/marketplace" className={navLinkClass(marketplaceActive, hero)}>
            Marketplace
          </Link>

          {authUser == null ? (
            <>
              {navDivider(hero)}
              <Link href="/login" className={navLinkClass(loginActive, hero)}>
                Log in
              </Link>
              <Link href="/signup" className={navLinkClass(signupActive, hero)}>
                Sign up
              </Link>
            </>
          ) : null}

          {authUser != null && navRole === "company" ? (
            <Link href="/company" className={navLinkClass(companyDashboardActive, hero)}>
              Company Dashboard
            </Link>
          ) : null}

          {authUser != null && navRole === "consultant" ? (
            <Link href="/consultant" className={navLinkClass(talentDashboardActive, hero)}>
              Talent Dashboard
            </Link>
          ) : null}

          {authUser != null && navRole === "admin" ? (
            <>
              <Link href="/admin/resources" className={navLinkClass(adminResourcesActive, hero)}>
                Admin
              </Link>
              <Link href="/admin/interviews" className={navLinkClass(adminInterviewsActive, hero)}>
                Interviews
              </Link>
              <Link href="/admin/engagements" className={navLinkClass(adminEngagementsActive, hero)}>
                Engagements
              </Link>
            </>
          ) : null}

          {authUser != null ? (
            <>
              {navDivider(hero)}
              <span
                className={`max-w-[10rem] truncate text-xs sm:max-w-[14rem] ${hero ? "text-white/55" : "text-zinc-500"}`}
                title={authUser.email ?? ""}
              >
                {authUser.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className={
                    hero
                      ? "rounded-md px-2.5 py-1.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
                      : "rounded-md px-2.5 py-1.5 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50"
                  }
                >
                  Log out
                </button>
              </form>
            </>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
