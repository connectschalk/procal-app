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
  id_number: string | null;
  id_validation_status: string | null;
  id_validated_at: string | null;
  id_dob: string | null;
  id_age: number | null;
  id_gender: string | null;
  id_citizenship: string | null;
  id_validation_error: string | null;
};

function maskSaIdDigits(n: string | null): string {
  if (n == null || n.trim() === "") return "—";
  const d = n.replace(/\D/g, "");
  if (d.length < 4) return "—";
  return `…${d.slice(-4)}`;
}

function formatAdminTimestamp(iso: string | null): string {
  if (iso == null || iso.trim() === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatAdminDate(iso: string | null): string {
  if (iso == null || iso.trim() === "") return "—";
  const slice = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slice)) return "—";
  const d = new Date(`${slice}T12:00:00`);
  if (Number.isNaN(d.getTime())) return slice;
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d);
}

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
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Headline</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">ID status</th>
              <th className="px-4 py-3">ID (last 4)</th>
              <th className="px-4 py-3">Validated</th>
              <th className="px-4 py-3">DOB</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Citizenship</th>
              <th className="px-4 py-3 max-w-[200px]">Validation error</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {initialRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-zinc-600">
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
                    <td className="px-4 py-3 text-zinc-700">{row.id_validation_status ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">{maskSaIdDigits(row.id_number)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatAdminTimestamp(row.id_validated_at)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatAdminDate(row.id_dob)}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.id_age != null ? String(row.id_age) : "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.id_gender ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.id_citizenship ?? "—"}</td>
                    <td className="max-w-[200px] px-4 py-3 text-xs text-zinc-600" title={row.id_validation_error ?? ""}>
                      {row.id_validation_error != null && row.id_validation_error.trim() !== ""
                        ? row.id_validation_error.length > 80
                          ? `${row.id_validation_error.slice(0, 80)}…`
                          : row.id_validation_error
                        : "—"}
                    </td>
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
