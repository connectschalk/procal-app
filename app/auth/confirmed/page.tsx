import { AccountActivatedClient } from "./account-activated-client";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Account activated | ProCal",
  description: "Your Procal account is ready. Log in to continue onboarding.",
};

function AuthConfirmedFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
      <p className="text-sm text-zinc-400">Loading…</p>
    </div>
  );
}

export default function AuthConfirmedPage() {
  return (
    <Suspense fallback={<AuthConfirmedFallback />}>
      <AccountActivatedClient />
    </Suspense>
  );
}
