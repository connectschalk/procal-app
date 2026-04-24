"use client";

/**
 * Admin resource approvals use permissive RLS + UPDATE from 003_enable_dev_update.sql.
 * This UPDATE policy (and dev read-all SELECT) is for development only and must be
 * restricted before production.
 */

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminResourceRow = {
  id: string;
  name: string | null;
  headline: string | null;
  location: string | null;
  profile_status: string | null;
};

export function AdminResourcesClient({
  initialRows,
  draftCount,
}: {
  initialRows: AdminResourceRow[];
  draftCount: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function approve(id: string) {
    setActionError(null);
    setBusyId(id);
    const { error } = await supabase
      .from("resources")
      .update({ profile_status: "approved" })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Drafts pending review:{" "}
        <span className="font-semibold text-zinc-900">{draftCount}</span>
      </p>

      {actionError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Headline</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {initialRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                  No resources found.
                </td>
              </tr>
            ) : (
              initialRows.map((row) => {
                const isDraft = row.profile_status === "draft";
                return (
                  <tr
                    key={row.id}
                    className={isDraft ? "bg-amber-50/70" : undefined}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-800">
                          {row.profile_status ?? "—"}
                        </span>
                        {isDraft ? (
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">
                            Draft
                          </span>
                        ) : row.profile_status === "approved" ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                            Approved
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-800">{row.name ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.headline ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      {isDraft ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void approve(row.id)}
                          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {busyId === row.id ? "…" : "Approve"}
                        </button>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
