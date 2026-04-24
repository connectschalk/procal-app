import { AppTopNav } from "@/components/app-top-nav";
import { MarketplaceWithFilters } from "@/components/marketplace-with-filters";
import type { MarketplaceResource } from "@/components/marketplace-consultant-grid";
import { supabase } from "@/lib/supabase";

const MISSING_TABLE_ERROR_CODE = "42P01";

export default async function MarketplacePage() {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("profile_status", "approved")
    .order("created_at", { ascending: false });

  const resources: MarketplaceResource[] = data ?? [];
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
          <MarketplaceWithFilters resources={resources} />
        )}
      </main>
    </>
  );
}
