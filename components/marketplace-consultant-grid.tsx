import Link from "next/link";
import { IdNumberVerifiedIndicator } from "@/components/id-number-verified-indicator";
import { PublicAvailabilitySummary } from "@/components/public-availability-summary";
import { computePublicAvailabilityView } from "@/lib/resource-availability";
import { getMarketplaceRoleIndustryLine } from "@/lib/resource-display";
import { getPublicTalentAvatarDisplay } from "@/lib/talent-avatar-library";

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
  if (rate == null) return null;
  if (!Number.isFinite(Number(rate))) return null;
  return `${new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(rate)} / hr`;
}

function buildMetadataLine(resource: MarketplaceResource): string | null {
  const parts: string[] = [];
  const loc = (resource.location ?? "").trim();
  if (loc !== "") parts.push(loc);
  const rate = formatRate(resource.hourly_rate);
  if (rate != null) parts.push(rate);
  if (resource.years_experience != null && Number.isFinite(Number(resource.years_experience))) {
    parts.push(`${resource.years_experience} years`);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
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
    "group flex h-full min-h-0 flex-col rounded-3xl border border-white/[0.09] bg-black/35 p-6 shadow-lg shadow-black/30 backdrop-blur-md transition duration-300 ease-out hover:-translate-y-1 hover:border-orange-500/25 hover:bg-black/45 hover:shadow-xl hover:shadow-orange-950/25";

  return (
    <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
      {resources.map((resource) => {
        const avatar = getPublicTalentAvatarDisplay(resource.avatar_key, resource.headline, resource.bio);
        const displayName = resource.can_reveal_identity ? resource.name : resource.anonymized_display_name;
        const roleIndustryLine = getMarketplaceRoleIndustryLine(resource);
        const availabilityView = computePublicAvailabilityView({
          blockedDataLoadSucceeded: resource.blocked_data_load_ok,
          blockedDatesIso: resource.blocked_dates_iso,
          availableFromIso: resource.available_from,
          selectedFilterIso: filterIso !== "" ? filterIso : null,
        });
        const metaLine = buildMetadataLine(resource);
        const bioText = (resource.bio ?? "").trim();

        return (
          <article key={resource.id} className={cardClass}>
            <div className="flex gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 ring-1 ring-white/[0.04] transition group-hover:border-orange-500/20"
                title={avatar.label}
              >
                {avatar.imagePath != null ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static stand-in avatar image
                  <img src={avatar.imagePath} alt={avatar.label} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg leading-none">{avatar.primary}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold tracking-tight text-white">{displayName}</h2>
                {resource.id_validation_status === "verified" ? (
                  <div className="mt-1.5">
                    <IdNumberVerifiedIndicator className="!px-2 !py-0.5 !text-[11px]" />
                  </div>
                ) : null}
                {roleIndustryLine != null ? (
                  <p className="mt-2 text-sm font-medium leading-snug text-zinc-400">{roleIndustryLine}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <PublicAvailabilitySummary view={availabilityView} size="xs" />
            </div>

            {metaLine != null ? (
              <p className="mt-3 text-sm leading-snug text-zinc-400">{metaLine}</p>
            ) : null}

            {bioText !== "" ? (
              <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-zinc-500">{bioText}</p>
            ) : (
              <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-zinc-600">No bio provided.</p>
            )}

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
        );
      })}
    </section>
  );
}
