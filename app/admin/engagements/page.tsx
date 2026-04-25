import {
  AdminEngagementsClient,
  type AdminEngagementProposalRow,
} from "@/components/admin-engagements-client";
import { AppTopNav } from "@/components/app-top-nav";
import { requireAdmin } from "@/lib/require-role";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminEngagementsPage() {
  await requireAdmin();

  const { data, error } = await supabase
    .from("engagement_proposals")
    .select(
      "id, resource_id, company_name, requester_name, requester_email, proposed_start_date, proposed_end_date, scope, proposed_rate, status, created_at",
    )
    .order("created_at", { ascending: false });

  const baseRows = (data ?? []).map((r) => ({
    id: r.id as string,
    resource_id: r.resource_id as string,
    company_name: r.company_name as string,
    requester_name: r.requester_name as string,
    requester_email: r.requester_email as string,
    proposed_start_date: (r.proposed_start_date as string | null) ?? null,
    proposed_end_date: (r.proposed_end_date as string | null) ?? null,
    scope: (r.scope as string | null) ?? null,
    proposed_rate: (r.proposed_rate as number | null) ?? null,
    status: (r.status as string) ?? "proposed",
    created_at: (r.created_at as string) ?? "",
  }));

  const uniqueResourceIds = [...new Set(baseRows.map((r) => r.resource_id))];
  const nameByResourceId: Record<string, string> = {};

  if (uniqueResourceIds.length > 0) {
    const { data: resourceRows } = await supabase.from("resources").select("id, name").in("id", uniqueResourceIds);

    for (const row of resourceRows ?? []) {
      const id = row.id as string;
      const name = row.name as string | null;
      if (name != null && name.trim() !== "") {
        nameByResourceId[id] = name.trim();
      }
    }
  }

  const rows: AdminEngagementProposalRow[] = baseRows.map((r) => ({
    ...r,
    consultant_name: nameByResourceId[r.resource_id] ?? null,
  }));

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Engagement proposals</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Incoming engagement offers from companies. Dev policies live in{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">009_engagement_proposals_mvp.sql</code>{" "}
            (anon SELECT/UPDATE with status-only trigger). Remove before production.
          </p>
        </header>

        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <span className="font-medium">Could not load proposals.</span>{" "}
            {error.message.includes("permission") || error.code === "42501"
              ? "Run 009_engagement_proposals_mvp.sql so anon can SELECT engagement_proposals during development."
              : error.message}
          </p>
        ) : null}

        {!error && rows.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            No engagement proposals yet.
          </p>
        ) : null}

        {!error && rows.length > 0 ? <AdminEngagementsClient initialRows={rows} /> : null}
      </main>
    </>
  );
}
