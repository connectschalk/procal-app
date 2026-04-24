import { AppTopNav } from "@/components/app-top-nav";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

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

function formatDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d);
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function ConsultantProfilePage({ params }: PageProps) {
  const { id } = await params;

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

  const today = localIsoDate(new Date());

  const { data: blockedRows, error: blockedError } = await supabase
    .from("resource_blocked_dates")
    .select("blocked_date, reason")
    .eq("resource_id", id)
    .gte("blocked_date", today)
    .order("blocked_date", { ascending: true });

  const upcomingBlocked =
    !blockedError && blockedRows != null && blockedRows.length > 0
      ? (blockedRows as { blocked_date: string; reason: string | null }[])
      : [];

  return (
    <>
      <AppTopNav />
      <main className="mx-auto min-h-screen w-full max-w-3xl bg-white px-6 py-10 md:px-10 md:py-16">
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

      <section className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-6 md:p-8">
        <h2 className="text-sm font-semibold text-zinc-900">Availability</h2>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Available from</h3>
            <p className="mt-1.5 text-sm text-zinc-800">
              {availableFrom != null ? formatDate(availableFrom) : "Not specified"}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Blocked dates</h3>
            {upcomingBlocked.length === 0 ? (
              <p className="mt-1.5 text-sm text-zinc-600">No blocked days published.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {upcomingBlocked.map((row, i) => (
                  <li key={`${row.blocked_date}-${i}`} className="text-sm text-zinc-800">
                    <span className="font-medium">{formatDate(row.blocked_date)}</span>
                    {row.reason?.trim() ? (
                      <span className="text-zinc-600"> — {row.reason.trim()}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/40 p-6 md:p-8">
        <h2 className="text-sm font-semibold text-zinc-900">Documents and verification</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Credentials and compliance documents will be listed here after verification is connected.
        </p>
      </section>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={`/consultants/${id}/request-interview`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 sm:flex-none"
        >
          Request interview
        </Link>
        <Link
          href={`/consultants/${id}/propose-engagement`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 sm:flex-none"
        >
          Propose engagement
        </Link>
      </div>
      </main>
    </>
  );
}
