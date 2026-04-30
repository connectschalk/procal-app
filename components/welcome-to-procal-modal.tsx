"use client";

import Link from "next/link";

type WelcomeToProcalModalProps = {
  open: boolean;
  onClose: () => void;
  variant: "company" | "talent";
  /** Company only: run before URL cleanup (e.g. switch to profile tab). */
  onCompanyCompleteProfile?: () => void;
};

/**
 * Post–email-confirmation welcome: consistent ProCal modal styling.
 */
export function WelcomeToProcalModal({
  open,
  onClose,
  variant,
  onCompanyCompleteProfile,
}: WelcomeToProcalModalProps) {
  if (!open) return null;

  const overlayClass = "fixed inset-0 z-[200] flex items-center justify-center p-4";
  const cardClass =
    "relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111111]/95 p-8 shadow-2xl shadow-black/50 backdrop-blur-md md:p-10";

  return (
    <div className={overlayClass}>
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close welcome dialog"
        onClick={onClose}
      />
      <div className={`${cardClass} z-[201]`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
        <h2 className="pr-10 text-xl font-semibold tracking-tight text-zinc-100 md:text-2xl">Welcome to ProCal</h2>
        {variant === "company" ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Create your company profile so you can start engaging verified talent.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Complete your Talent profile, choose your avatar, upload your documents, and set your availability.
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          {variant === "company" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onCompanyCompleteProfile?.();
                  onClose();
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 sm:order-1 sm:w-auto"
              >
                Complete company profile
              </button>
              <Link
                href="/marketplace"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 sm:order-2 sm:w-auto"
              >
                Explore marketplace
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/talent/edit"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 sm:order-1 sm:w-auto"
              >
                Complete Talent profile
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 sm:order-2 sm:w-auto"
              >
                Go to dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
