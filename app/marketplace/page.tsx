import { AppTopNav } from "@/components/app-top-nav";
import { MarketplaceWithFilters } from "@/components/marketplace-with-filters";
import type { MarketplaceResource } from "@/components/marketplace-consultant-grid";
import { supabase } from "@/lib/supabase";

const MISSING_TABLE_ERROR_CODE = "42P01";

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
      "id, name, headline, location, hourly_rate, years_experience, bio, profile_status, created_at, available_from",
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
    const af = r.available_from as string | null | undefined;
    const upcoming = upcomingBlockedByResource.get(id);
    const nextBlocked = upcoming != null && upcoming.length > 0 ? upcoming[0] : null;
    return {
      id,
      name: (r.name as string) ?? "",
      headline: (r.headline as string | null) ?? null,
      location: (r.location as string | null) ?? null,
      hourly_rate: (r.hourly_rate as number | null) ?? null,
      years_experience: (r.years_experience as number | null) ?? null,
      bio: (r.bio as string | null) ?? null,
      available_from: af != null && String(af).trim() !== "" ? String(af).slice(0, 10) : null,
      next_blocked_date: nextBlocked,
    };
  });
  const message = error
    ? error.code === MISSING_TABLE_ERROR_CODE
      ? 'The "resources" table does not exist yet.'
      : "Unable to load consultants right now. Please try again shortly."
    : null;

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
            Consultant Marketplace
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
            Discover trusted consultants and specialists. Compare profile highlights and engage the
            right expertise for your project.
          </p>
        </header>

        {message ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            {message}
          </p>
        ) : resources.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            No consultants are available yet.
          </p>
        ) : (
          <MarketplaceWithFilters resources={resources} blockedDateRows={blockedDateRows} />
        )}
      </main>
    </>
  );
}
