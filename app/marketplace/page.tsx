import { AppTopNav } from "@/components/app-top-nav";
import { MarketplaceWithFilters } from "@/components/marketplace-with-filters";
import type { MarketplaceResource } from "@/components/marketplace-consultant-grid";
import { getAnonymizedTalentDisplayName, getCompanyRelationshipMap } from "@/lib/talent-identity";
import { supabase } from "@/lib/supabase";

const MISSING_TABLE_ERROR_CODE = "42P01";
const ACCENT = "#ff6a00";

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function MarketplacePage() {
  const { data, error } = await supabase
    .from("resources")
    .select(
      "id, name, headline, location, hourly_rate, years_experience, bio, profile_status, created_at, available_from, avatar_key",
    )
    .eq("profile_status", "approved")
    .order("created_at", { ascending: false });

  const baseRows = data ?? [];
  const resourceIds = baseRows.map((r) => r.id as string);

  let blockedDateRows: { resource_id: string; blocked_date: string }[] = [];
  if (resourceIds.length > 0) {
    const { data: blockedData, error: blockedError } = await supabase
      .from("resource_blocked_dates")
      .select("resource_id, blocked_date")
      .in("resource_id", resourceIds);

    if (!blockedError && blockedData != null) {
      blockedDateRows = blockedData.map((row) => ({
        resource_id: row.resource_id as string,
        blocked_date: String(row.blocked_date).slice(0, 10),
      }));
    }
  }

  const today = localIsoDate(new Date());
  const upcomingBlockedByResource = new Map<string, string[]>();
  for (const row of blockedDateRows) {
    if (row.blocked_date < today) continue;
    const list = upcomingBlockedByResource.get(row.resource_id);
    if (list == null) {
      upcomingBlockedByResource.set(row.resource_id, [row.blocked_date]);
    } else {
      list.push(row.blocked_date);
    }
  }
  for (const list of upcomingBlockedByResource.values()) {
    list.sort((a, b) => a.localeCompare(b));
  }

  const resources: MarketplaceResource[] = baseRows.map((r) => {
    const id = r.id as string;
    const headline = (r.headline as string | null) ?? null;
    const af = r.available_from as string | null | undefined;
    const upcoming = upcomingBlockedByResource.get(id);
    const nextBlocked = upcoming != null && upcoming.length > 0 ? upcoming[0] : null;
    return {
      id,
      name: (r.name as string) ?? "",
      anonymized_display_name: getAnonymizedTalentDisplayName(headline, id),
      can_reveal_identity: false,
      headline,
      location: (r.location as string | null) ?? null,
      hourly_rate: (r.hourly_rate as number | null) ?? null,
      years_experience: (r.years_experience as number | null) ?? null,
      bio: (r.bio as string | null) ?? null,
      avatar_key: (r.avatar_key as string | null) ?? null,
      available_from: af != null && String(af).trim() !== "" ? String(af).slice(0, 10) : null,
      next_blocked_date: nextBlocked,
    };
  });
  const relationshipMap = await getCompanyRelationshipMap(resources.map((resource) => resource.id));
  for (const resource of resources) {
    resource.can_reveal_identity = relationshipMap.get(resource.id) === true;
  }
  const message = error
    ? error.code === MISSING_TABLE_ERROR_CODE
      ? 'The "resources" table does not exist yet.'
      : "Unable to load consultants right now. Please try again shortly."
    : null;

  const noticeClass =
    "rounded-3xl border border-white/10 bg-black/35 px-5 py-4 text-sm leading-relaxed text-white/75 backdrop-blur-md";

  return (
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

      <AppTopNav variant="hero" />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 md:gap-10 md:px-10 md:pb-20 md:pt-10">
        <header className="max-w-3xl space-y-3 md:space-y-4">
          <p
            className="text-[10px] font-medium uppercase tracking-widest sm:text-[11px]"
            style={{ color: ACCENT }}
          >
            VERIFIED TALENT MARKETPLACE
          </p>
          <h1 className="text-balance text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-4xl md:text-[2.35rem] md:leading-[1.08]">
            Find the right professional for your next project
          </h1>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-white/65 sm:text-base">
            Browse approved talent, check availability, and request interviews or engagements.
          </p>
        </header>

        {message ? (
          <p className={noticeClass}>{message}</p>
        ) : resources.length === 0 ? (
          <p className={noticeClass}>No consultants are available yet.</p>
        ) : (
          <MarketplaceWithFilters resources={resources} blockedDateRows={blockedDateRows} />
        )}
      </main>
    </div>
  );
}
