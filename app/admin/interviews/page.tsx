import {
  AdminInterviewsClient,
  type AdminInterviewRequestRow,
} from "@/components/admin-interviews-client";
import { AppTopNav } from "@/components/app-top-nav";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminInterviewsPage() {
  const { data, error } = await supabase
    .from("interview_requests")
    .select(
      "id, resource_id, company_name, requester_name, requester_email, message, proposed_slot_1, proposed_slot_2, proposed_slot_3, selected_slot, status, created_at",
    )
    .order("created_at", { ascending: false });

  const baseRows = (data ?? []).map((r) => ({
    id: r.id as string,
    resource_id: r.resource_id as string,
    company_name: r.company_name as string,
    requester_name: r.requester_name as string,
    requester_email: r.requester_email as string,
    message: (r.message as string | null) ?? null,
    proposed_slot_1: (r.proposed_slot_1 as string | null) ?? null,
    proposed_slot_2: (r.proposed_slot_2 as string | null) ?? null,
    proposed_slot_3: (r.proposed_slot_3 as string | null) ?? null,
    selected_slot: (r.selected_slot as string | null) ?? null,
    status: (r.status as string) ?? "requested",
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

  const rows: AdminInterviewRequestRow[] = baseRows.map((r) => ({
    ...r,
    consultant_name: nameByResourceId[r.resource_id] ?? null,
  }));

  return (
    <>
      <AppTopNav />
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 bg-white px-6 py-10 md:px-10 md:py-14">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Interview requests</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Incoming requests from companies. Dev policies:{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">005_dev_read_interview_requests.sql</code>{" "}
            (read) and{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">006_dev_update_interview_status.sql</code>{" "}
            (status updates). Remove before production.
          </p>
        </header>

        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <span className="font-medium">Could not load requests.</span>{" "}
            {error.message.includes("permission") || error.code === "42501"
              ? "Run 005_dev_read_interview_requests.sql so anon can SELECT interview_requests during development."
              : error.message}
          </p>
        ) : null}

        {!error && rows.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            No interview requests yet.
          </p>
        ) : null}

        {!error && rows.length > 0 ? <AdminInterviewsClient initialRows={rows} /> : null}
      </main>
    </>
  );
}
