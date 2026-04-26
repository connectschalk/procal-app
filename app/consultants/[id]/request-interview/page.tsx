import { AppTopNav } from "@/components/app-top-nav";
import { InterviewRequestForm } from "@/components/interview-request-form";
import { isCompanyProfileComplete } from "@/lib/company-profile";
import { getCompanyProfileByUserId } from "@/lib/company-profile-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getPublicTalentAvatarDisplay } from "@/lib/talent-avatar-library";
import { requireCompany } from "@/lib/require-role";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const glassCard =
  "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/25 backdrop-blur-md md:p-7";
const accentEyebrow =
  "text-[10px] font-semibold uppercase tracking-widest text-[#ff6a00] md:text-[11px]";

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

function truncateBio(s: string | null, max = 220): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (t.length === 0) return null;
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

export default async function RequestInterviewPage({ params }: PageProps) {
  const { id } = await params;
  await requireCompany({ returnPath: `/consultants/${id}/request-interview` });
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (user == null) {
    redirect(`/login?next=${encodeURIComponent(`/consultants/${id}/request-interview`)}`);
  }
  const companyProfile = await getCompanyProfileByUserId(user.id);
  if (!isCompanyProfileComplete(companyProfile)) {
    redirect("/company?completeProfile=1");
  }

  const { data, error } = await supabase
    .from("resources")
    .select("id, name, headline, location, hourly_rate, bio, avatar_key")
    .eq("id", id)
    .eq("profile_status", "approved")
    .single();

  if (error || !data) {
    notFound();
  }

  const consultantName = (data.name as string) ?? "Talent";
  const headline = (data.headline as string | null) ?? null;
  const location = (data.location as string | null) ?? null;
  const hourlyRate = data.hourly_rate as number | null;
  const bioRaw = (data.bio as string | null) ?? null;
  const avatarKey = (data.avatar_key as string | null) ?? null;
  const avatar = getPublicTalentAvatarDisplay(avatarKey, headline, bioRaw);
  const bioShort = truncateBio(bioRaw);

  return (
    <>
      <AppTopNav variant="hero" />
      <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -top-32 left-1/2 h-[min(55vh,28rem)] w-[min(140%,48rem)] -translate-x-1/2 rounded-full opacity-90 blur-3xl"
            style={{
              background: `radial-gradient(closest-side, rgba(255,106,0,0.14), transparent 72%)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black" />
        </div>

        <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 md:px-8 md:pb-20 md:pt-8">
          <Link
            href={`/consultants/${id}`}
            className="inline-flex text-sm font-medium text-white/55 transition hover:text-white"
          >
            ← Back to profile
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            <aside className="lg:col-span-5">
              <div className={glassCard}>
                <p className={accentEyebrow}>Talent</p>
                <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <div
                    className="flex h-[100px] w-[100px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border border-white/10 bg-gradient-to-br from-zinc-600/80 via-zinc-800 to-zinc-950 shadow-inner"
                    title={avatar.label}
                  >
                    {avatar.imagePath != null ? (
                      // eslint-disable-next-line @next/next/no-img-element -- static stand-in avatar image
                      <img src={avatar.imagePath} alt={avatar.label} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <>
                        <span className="select-none text-[2.25rem] leading-none">{avatar.primary}</span>
                        <span className="select-none text-lg leading-none">{avatar.secondary}</span>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">{consultantName}</h1>
                    {headline != null && headline.trim() !== "" ? (
                      <p className="mt-1.5 text-sm leading-snug text-white/70">{headline}</p>
                    ) : null}
                    {location != null && location.trim() !== "" ? (
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-white/45">{location}</p>
                    ) : null}
                    <p className="mt-2 text-sm font-semibold text-white/90">{formatHourlyRateZar(hourlyRate)}</p>
                  </div>
                </div>
                {bioShort != null ? (
                  <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-relaxed text-white/60">{bioShort}</p>
                ) : (
                  <p className="mt-5 border-t border-white/10 pt-5 text-sm text-white/40">No bio yet.</p>
                )}
              </div>
            </aside>

            <section className="lg:col-span-7">
              <InterviewRequestForm resourceId={id} consultantName={consultantName} />
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
