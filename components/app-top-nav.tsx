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
    return "rounded-md bg-orange-50/90 px-2.5 py-1.5 text-sm font-semibold text-orange-700 ring-1 ring-orange-200/80 transition-colors";
  }
  return "rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900";
}

function navDivider() {
  return <span className="mx-1 hidden h-5 w-px bg-zinc-200 sm:inline-block" aria-hidden />;
}

export function AppTopNav() {
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
  const talentDashboardActive = pathname === "/consultant" || pathname.startsWith("/consultant/");
  const adminResourcesActive = pathname.startsWith("/admin/resources");
  const adminInterviewsActive = pathname.startsWith("/admin/interviews");
  const adminEngagementsActive = pathname.startsWith("/admin/engagements");
  const loginActive = pathname === "/login";
  const signupActive = pathname === "/signup";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3.5 md:flex-row md:items-center md:justify-between md:px-10 md:py-4">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-zinc-950 transition-colors hover:text-orange-600"
        >
          Procal
        </Link>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
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
            <Link href="/company" className={navLinkClass(companyDashboardActive)}>
              Company Dashboard
            </Link>
          ) : null}

          {authUser != null && navRole === "consultant" ? (
            <Link href="/consultant" className={navLinkClass(talentDashboardActive)}>
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
              <span
                className="max-w-[10rem] truncate text-xs text-zinc-500 sm:max-w-[14rem]"
                title={authUser.email ?? ""}
              >
                {authUser.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md px-2.5 py-1.5 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50"
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
