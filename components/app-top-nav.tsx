"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navLinkClass(active: boolean) {
  if (active) {
    return "rounded-md bg-orange-50/90 px-2.5 py-1.5 text-sm font-semibold text-orange-700 ring-1 ring-orange-200/80 transition-colors";
  }
  return "rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900";
}

export function AppTopNav() {
  const pathname = usePathname() ?? "";

  const marketplaceActive =
    pathname === "/marketplace" || pathname.startsWith("/consultants");
  const createActive = pathname === "/create";
  const myRequestsActive = pathname === "/requests";
  const companyDashboardActive = pathname === "/company";
  const adminResourcesActive = pathname.startsWith("/admin/resources");
  const adminInterviewsActive = pathname.startsWith("/admin/interviews");

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
          <Link href="/company" className={navLinkClass(companyDashboardActive)}>
            Company Dashboard
          </Link>
          <Link href="/requests" className={navLinkClass(myRequestsActive)}>
            My Requests
          </Link>
          <Link href="/create" className={navLinkClass(createActive)}>
            Add Consultant
          </Link>
          <Link href="/admin/resources" className={navLinkClass(adminResourcesActive)}>
            Admin
          </Link>
          <Link href="/admin/interviews" className={navLinkClass(adminInterviewsActive)}>
            Interviews
          </Link>
        </div>
      </nav>
    </header>
  );
}
