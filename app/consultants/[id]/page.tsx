import { AppTopNav } from "@/components/app-top-nav";
import { PublicAvailabilityCalendar } from "@/components/public-availability-calendar";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatHourlyRateZar(rate: number | null) {
  if (rate == null) return "Rate on request";
  return `${new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(rate)} / hr`;
}

export default async function ConsultantProfilePage({ params }: PageProps) {
  const { id } = await params;

  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const requestInterviewPath = `/consultants/${id}/request-interview`;
  const proposeEngagementPath = `/consultants/${id}/propose-engagement`;
  const requestInterviewHref =
    user != null ? requestInterviewPath : `/login?next=${encodeURIComponent(requestInterviewPath)}`;
  const proposeEngagementHref =
    user != null ? proposeEngagementPath : `/login?next=${encodeURIComponent(proposeEngagementPath)}`;

  const { data, error } = await supabase
    .from("resources")
    .select("id, name, headline, location, hourly_rate, years_experience, bio, profile_status, created_at, available_from")
    .eq("id", id)
    .eq("profile_status", "approved")
    .single();

  if (error || !data) {
    notFound();
  }

  const name = data.name as string;
  const headline = (data.headline as string | null) ?? null;
  const location = (data.location as string | null) ?? null;
  const hourly_rate = data.hourly_rate as number | null;
  const years_experience = data.years_experience as number | null;
  const bio = (data.bio as string | null) ?? null;
  const availableFromRaw = data.available_from as string | null | undefined;
  const availableFrom =
    availableFromRaw != null && String(availableFromRaw).trim() !== ""
      ? String(availableFromRaw).slice(0, 10)
      : null;

  const { data: blockedRows, error: blockedError } = await supabase
    .from("resource_blocked_dates")
    .select("blocked_date, reason")
    .eq("resource_id", id)
    .order("blocked_date", { ascending: true });

  const blockedForCalendar =
    !blockedError && blockedRows != null
      ? (blockedRows as { blocked_date: string; reason: string | null }[]).map((r) => ({
          blocked_date: String(r.blocked_date).slice(0, 10),
          reason: r.reason,
        }))
      : [];

  return (
    <>
      <AppTopNav />
      <main className="mx-auto min-h-screen w-full max-w-4xl bg-white px-6 py-10 md:px-10 md:py-16">
      <Link
        href="/marketplace"
        className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
      >
        ← Back to marketplace
      </Link>

      <header className="mt-8 space-y-3 border-b border-zinc-200 pb-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Consultant</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{name}</h1>
        <p className="text-lg text-zinc-600">{headline ?? "Consultant"}</p>
      </header>

      <dl className="mt-10 grid grid-cols-1 gap-6 border-b border-zinc-200 pb-10 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Location</dt>
          <dd className="mt-1 text-base font-medium text-zinc-900">{location ?? "Remote"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Hourly rate</dt>
          <dd className="mt-1 text-base font-medium text-zinc-900">
            {formatHourlyRateZar(hourly_rate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Experience</dt>
          <dd className="mt-1 text-base font-medium text-zinc-900">
            {years_experience != null ? `${years_experience} years` : "Not listed"}
          </dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">About</h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-700">{bio ?? "No bio provided."}</p>
      </section>

      <section className="mt-12">
        <PublicAvailabilityCalendar availableFrom={availableFrom} blockedDates={blockedForCalendar} />
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-6 md:p-8">
        <h2 className="text-sm font-semibold text-zinc-900">Documents and verification</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Credentials and compliance documents will be listed here after verification is connected.
        </p>
      </section>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={requestInterviewHref}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 sm:flex-none"
        >
          Request interview
        </Link>
        <Link
          href={proposeEngagementHref}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 sm:flex-none"
        >
          Propose engagement
        </Link>
      </div>
      </main>
    </>
  );
}
