import { AdminResourcesClient, type AdminResourceRow } from "@/components/admin-resources-client";
import { AppTopNav } from "@/components/app-top-nav";
import { requireAdmin } from "@/lib/require-role";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RowWithCreated = AdminResourceRow & { created_at: string | null };

export default async function AdminResourcesPage() {
  await requireAdmin();

  const { data, error } = await supabase
    .from("resources")
    .select("id, name, headline, location, profile_status, created_at")
    .order("created_at", { ascending: false });

  const mapped: RowWithCreated[] = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string | null,
    headline: r.headline as string | null,
    location: r.location as string | null,
    profile_status: r.profile_status as string | null,
    created_at: (r.created_at as string | null) ?? null,
  }));

  const draftCount = mapped.filter((r) => r.profile_status === "draft").length;

  const sorted: AdminResourceRow[] = [...mapped]
    .sort((a, b) => {
      const da = a.profile_status === "draft" ? 0 : 1;
      const db = b.profile_status === "draft" ? 0 : 1;
      if (da !== db) return da - db;
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    })
    .map((r) => ({
      id: r.id,
      name: r.name,
      headline: r.headline,
      location: r.location,
      profile_status: r.profile_status,
    }));

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Resource admin</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Drafts are listed first. After running{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">003_enable_dev_update.sql</code>,
            you can approve from the browser. Remove dev policies before production.
          </p>
        </header>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error.message}
          </p>
        ) : null}

        <AdminResourcesClient initialRows={sorted} draftCount={draftCount} />
      </main>
    </>
  );
}
