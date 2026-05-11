import Link from "next/link";
import { IdNumberVerifiedIndicator } from "@/components/id-number-verified-indicator";
import { PublicAvailabilitySummary } from "@/components/public-availability-summary";
import { computePublicAvailabilityView } from "@/lib/resource-availability";
import { getPublicTalentAvatarDisplay } from "@/lib/talent-avatar-library";
import { getResourceTypeLabel } from "@/lib/resource-display";

export type MarketplaceResource = {
  id: string;
  name: string;
  anonymized_display_name: string;
  can_reveal_identity: boolean;
  headline: string | null;
  location: string | null;
  hourly_rate: number | null;
  years_experience: number | null;
  bio: string | null;
  avatar_key: string | null;
  industry: string | null;
  resource_type: string | null;
  other_resource_type: string | null;
  /** ISO date YYYY-MM-DD or null when unset */
  available_from: string | null;
  /** All blocked dates for this resource (YYYY-MM-DD), same source as /talent/availability */
  blocked_dates_iso: string[];
  /** False when `resource_blocked_dates` could not be loaded — do not assume available */
  blocked_data_load_ok: boolean;
  /** When `verified`, show ID number verified badge (SA ID format check only). */
  id_validation_status: string | null;
};

const ACCENT = "#ff6a00";

function formatRate(rate: number | null) {
  if (rate == null) return "Rate on request";
  return `${new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(rate)} / hr`;
}

export function MarketplaceConsultantGrid({
  resources,
  activeAvailabilityDate = "",
}: {
  resources: MarketplaceResource[];
  /** YYYY-MM-DD when the marketplace date filter is set */
  activeAvailabilityDate?: string;
}) {
  const filterIso = activeAvailabilityDate.trim();

  const cardClass =
    "group flex h-full flex-col rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg shadow-black/25 backdrop-blur-md transition duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-black/40 hover:shadow-xl hover:shadow-orange-950/20";

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {resources.map((resource) => (
        <article key={resource.id} className={cardClass}>
          {(() => {
            const avatar = getPublicTalentAvatarDisplay(resource.avatar_key, resource.headline, resource.bio);
            const displayName = resource.can_reveal_identity ? resource.name : resource.anonymized_display_name;
            const resourceTypeLabel = getResourceTypeLabel(resource);
            const availabilityView = computePublicAvailabilityView({
              blockedDataLoadSucceeded: resource.blocked_data_load_ok,
              blockedDatesIso: resource.blocked_dates_iso,
              availableFromIso: resource.available_from,
              selectedFilterIso: filterIso !== "" ? filterIso : null,
            });
            return (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    title={avatar.label}
                  >
                    {avatar.imagePath != null ? (
                      // eslint-disable-next-line @next/next/no-img-element -- static stand-in avatar image
                      <img src={avatar.imagePath} alt={avatar.label} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg leading-none">{avatar.primary}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-white">{displayName}</h2>
                      {resource.id_validation_status === "verified" ? <IdNumberVerifiedIndicator /> : null}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <PublicAvailabilitySummary view={availabilityView} size="xs" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">
                      {resource.industry?.trim() || "Industry not listed"}
                    </p>
                    <p className="text-sm font-medium text-white">{resourceTypeLabel}</p>
                  </div>
                  <p className="text-sm text-zinc-300">
                    {resource.headline ?? "Verified Talent"}
                  </p>
                </div>
              </>
            );
          })()}

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Location</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">{resource.location ?? "Remote"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Rate</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">{formatRate(resource.hourly_rate)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Experience</dt>
              <dd className="mt-0.5 font-medium text-zinc-100">
                {resource.years_experience != null
                  ? `${resource.years_experience} years`
                  : "Experience not listed"}
              </dd>
            </div>
          </dl>

          <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
            {resource.bio ?? "No bio provided."}
          </p>

          <div className="mt-5 border-t border-white/[0.06] pt-5">
            <Link
              href={`/consultants/${resource.id}`}
              className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              style={{ backgroundColor: ACCENT }}
            >
              View profile
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
