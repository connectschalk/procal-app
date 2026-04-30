import { AppTopNav } from "@/components/app-top-nav";
import { PublicAvailabilityCalendar } from "@/components/public-availability-calendar";
import { isCompanyProfileComplete } from "@/lib/company-profile";
import { getCompanyProfileByUserId, getUserRoleById } from "@/lib/company-profile-server";
import { getAnonymizedTalentDisplayName, getCompanyRelationshipMap } from "@/lib/talent-identity";
import { getPublicTalentAvatarDisplay } from "@/lib/talent-avatar-library";
import { getResourceCategoryLabel } from "@/lib/resource-display";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const ACCENT = "#ff6a00";

type PageProps = {
  params: Promise<{ id: string }>;
};

function TalentAvatarCircle({
  imagePath,
  primary,
  secondary,
  label,
}: {
  imagePath: string | null;
  primary: string;
  secondary: string;
  label: string;
}) {
  return (
    <div
      className="relative flex h-[120px] w-[120px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border border-white/10 bg-gradient-to-br from-zinc-600/80 via-zinc-800 to-zinc-950 shadow-inner shadow-black/50 md:h-[180px] md:w-[180px]"
      aria-hidden
      title={label}
    >
      {imagePath != null ? (
        // eslint-disable-next-line @next/next/no-img-element -- static stand-in avatar image
        <img src={imagePath} alt={label} className="h-full w-full rounded-full object-cover" />
      ) : (
        <>
          <span className="select-none text-[2.75rem] leading-none md:text-[3.75rem]">{primary}</span>
          <span className="select-none text-[1.35rem] leading-none md:text-[1.85rem]">{secondary}</span>
        </>
      )}
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2V7a3 3 0 10-6 0v2h6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4.5 8.5c0 3.5 5.5 8 5.5 8s5.5-4.5 5.5-8a5.5 5.5 0 10-11 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3.5 6.5h13v7h-13v-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M3.5 9.5h13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M6 7V5.5a2 2 0 012-2h4a2 2 0 012 2V7M4 7h12v9H4V7z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatHourlyRateZar(rate: number | null) {
  if (rate == null) return "Rate on request";
  return `${new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(rate)} / hr`;
}

const glassCard = "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-md md:p-8";
const accentEyebrow =
  "text-[10px] font-semibold uppercase tracking-widest text-[#ff6a00] md:text-[11px]";
const statLabel = "text-[10px] font-semibold uppercase tracking-widest text-white/45 md:text-[11px]";

export default async function ConsultantProfilePage({ params }: PageProps) {
  const { id } = await params;

  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  const requestInterviewPath = `/consultants/${id}/request-interview`;
  const proposeEngagementPath = `/consultants/${id}/propose-engagement`;
  let requestInterviewHref = user != null ? requestInterviewPath : `/login?next=${encodeURIComponent(requestInterviewPath)}`;
  let proposeEngagementHref = user != null ? proposeEngagementPath : `/login?next=${encodeURIComponent(proposeEngagementPath)}`;
  let companyNeedsProfileCompletion = false;
  if (user != null) {
    const role = await getUserRoleById(user.id);
    const isCompanyUser = role === "company";
    if (isCompanyUser) {
      const companyProfile = await getCompanyProfileByUserId(user.id);
      if (!isCompanyProfileComplete(companyProfile)) {
        companyNeedsProfileCompletion = true;
        requestInterviewHref = "/company?completeProfile=1";
        proposeEngagementHref = "/company?completeProfile=1";
      }
    }
  }

  const { data, error } = await supabase
    .from("resources")
    // Do not select private verification paths (cv_document_path, id_*); never expose on public profile.
    .select(
      "id, name, headline, location, hourly_rate, years_experience, bio, profile_status, created_at, available_from, avatar_key, industry, resource_type, other_resource_type",
    )
    .eq("id", id)
    .eq("profile_status", "approved")
    .single();

  if (error || !data) {
    notFound();
  }

  const name = data.name as string;
  const headline = (data.headline as string | null) ?? null;
  const industry = (data.industry as string | null) ?? null;
  const resourceType = (data.resource_type as string | null) ?? null;
  const otherResourceType = (data.other_resource_type as string | null) ?? null;
  const relationshipMap = await getCompanyRelationshipMap([id]);
  const canRevealIdentity = relationshipMap.get(id) === true;
  const displayName = canRevealIdentity ? name : getAnonymizedTalentDisplayName(headline, id);
  const categoryLine = getResourceCategoryLabel({
    industry,
    resource_type: resourceType,
    other_resource_type: otherResourceType,
    headline,
  });
  const publicTitle = headline?.trim() ? headline : "Verified Talent";
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

  const avatarKey = (data as { avatar_key?: string | null }).avatar_key ?? null;
  const avatarVisual = getPublicTalentAvatarDisplay(avatarKey, headline, bio);

  const statShell =
    "flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm";

  return (
    <>
      <AppTopNav variant="hero" />
      <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -top-24 left-1/2 h-[min(50vh,26rem)] w-[min(130%,44rem)] -translate-x-1/2 rounded-full opacity-90 blur-3xl"
            style={{
              background: `radial-gradient(closest-side, rgba(255,106,0,0.12), transparent 72%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-black" />
        </div>

        <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 md:px-10 md:pb-20 md:pt-8">
          <Link
            href="/marketplace"
            className="inline-flex text-sm font-medium text-white/60 transition-colors duration-200 hover:text-white"
          >
            ← Back to marketplace
          </Link>

          <div className={`${glassCard} mt-6`}>
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-10">
              <div className="flex shrink-0 flex-col items-center md:items-center">
                {/* TODO: Later: show profile_photo_path (real photo) only after company payment / unlock. */}
                <TalentAvatarCircle
                  imagePath={avatarVisual.imagePath}
                  primary={avatarVisual.primary}
                  secondary={avatarVisual.secondary}
                  label={avatarVisual.label}
                />
                <p className="mt-4 flex max-w-[14rem] items-start justify-center gap-2 text-center text-xs leading-snug text-white/55">
                  <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff6a00]" />
                  <span>Real photo visible after engagement approval</span>
                </p>
              </div>

              <div className="min-w-0 flex-1 text-center md:text-left">
                <p className={accentEyebrow}>Talent profile</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">{displayName}</h1>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-orange-400">{categoryLine}</p>
                <p className="mt-2 text-lg text-white/70 md:text-xl">{publicTitle}</p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className={statShell}>
                    <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#ff6a00]" />
                    <div className="min-w-0 text-left">
                      <p className={statLabel}>Location</p>
                      <p className="mt-1 text-sm font-semibold text-white">{location ?? "Remote"}</p>
                    </div>
                  </div>
                  <div className={statShell}>
                    <RateIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#ff6a00]" />
                    <div className="min-w-0 text-left">
                      <p className={statLabel}>Hourly rate</p>
                      <p className="mt-1 text-sm font-semibold text-white">{formatHourlyRateZar(hourly_rate)}</p>
                    </div>
                  </div>
                  <div className={statShell}>
                    <BriefcaseIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#ff6a00]" />
                    <div className="min-w-0 text-left">
                      <p className={statLabel}>Experience</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {years_experience != null ? `${years_experience} years` : "Not listed"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className={`${glassCard} mt-6`}>
            <h2 className={accentEyebrow}>About</h2>
            <p className="mt-3 text-base leading-relaxed text-white/70">{bio ?? "No bio provided."}</p>
          </section>

          <section className={`${glassCard} mt-6`}>
            <PublicAvailabilityCalendar
              availableFrom={availableFrom}
              blockedDates={blockedForCalendar}
              theme="dark"
            />
          </section>

          <section className={`${glassCard} mt-6`}>
            <h2 className="text-sm font-semibold text-white">Documents and verification</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Credentials and compliance documents will be listed here after verification is connected.
            </p>
          </section>

          <div className={`${glassCard} mt-8`}>
            <h2 className="text-lg font-semibold text-white">Contact this talent</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
              Request an interview or propose an engagement to start the process.
            </p>
            {companyNeedsProfileCompletion ? (
              <p className="mt-2 text-sm text-amber-200/90">
                Complete your company profile before contacting talent.
              </p>
            ) : null}
            {/* TODO: Later require active subscription/payment before allowing engagement actions. */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={requestInterviewHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white shadow-md transition duration-200 hover:brightness-105 sm:flex-none sm:min-w-[11rem]"
                style={{ backgroundColor: ACCENT }}
              >
                Request interview
              </Link>
              <Link
                href={proposeEngagementHref}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-white/15 bg-black/30 px-6 text-sm font-semibold text-white backdrop-blur-sm transition duration-200 hover:border-white/25 hover:bg-black/45 sm:flex-none sm:min-w-[11rem]"
              >
                Propose engagement
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
