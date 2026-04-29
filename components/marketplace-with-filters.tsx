"use client";

import { useMemo, useState } from "react";
import {
  MarketplaceConsultantGrid,
  type MarketplaceResource,
} from "@/components/marketplace-consultant-grid";

const ACCENT = "#ff6a00";

const fieldLabelClass = "text-xs font-medium uppercase tracking-wide text-zinc-400";
const inputClass =
  "w-full min-w-0 rounded-xl border border-zinc-600/50 bg-zinc-900/70 px-3 py-2.5 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none ring-orange-500/0 transition placeholder:text-zinc-500 focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/25";

function matchesSearch(resource: MarketplaceResource, query: string) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [resource.anonymized_display_name, resource.headline ?? "", resource.bio ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function buildBlockedByResource(rows: { resource_id: string; blocked_date: string }[]) {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    let set = map.get(row.resource_id);
    if (set == null) {
      set = new Set<string>();
      map.set(row.resource_id, set);
    }
    set.add(row.blocked_date);
  }
  return map;
}

function passesAvailableByDate(
  resource: MarketplaceResource,
  selectedIso: string,
  blockedByResource: Map<string, Set<string>>,
): boolean {
  const af = resource.available_from;
  if (af != null && af.trim() !== "" && af > selectedIso) {
    return false;
  }
  const blocked = blockedByResource.get(resource.id);
  if (blocked != null && blocked.has(selectedIso)) {
    return false;
  }
  return true;
}

export function MarketplaceWithFilters({
  resources,
  blockedDateRows,
}: {
  resources: MarketplaceResource[];
  blockedDateRows: { resource_id: string; blocked_date: string }[];
}) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [minYears, setMinYears] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [availableByDate, setAvailableByDate] = useState("");

  const blockedByResource = useMemo(() => buildBlockedByResource(blockedDateRows), [blockedDateRows]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources) {
      const loc = (r.location ?? "").trim();
      if (loc) set.add(loc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const filtered = useMemo(() => {
    const minY = minYears.trim() === "" ? null : Number.parseInt(minYears, 10);
    const maxR = maxRate.trim() === "" ? null : Number(maxRate);
    const dateFilter = availableByDate.trim();

    return resources.filter((r) => {
      if (!matchesSearch(r, search)) return false;

      if (location) {
        const loc = (r.location ?? "").trim();
        if (loc.toLowerCase() !== location.toLowerCase()) return false;
      }

      if (minY !== null && !Number.isNaN(minY)) {
        if (r.years_experience == null || r.years_experience < minY) return false;
      }

      if (maxR !== null && !Number.isNaN(maxR)) {
        if (r.hourly_rate != null && r.hourly_rate > maxR) return false;
      }

      if (dateFilter !== "") {
        if (!passesAvailableByDate(r, dateFilter, blockedByResource)) return false;
      }

      return true;
    });
  }, [resources, search, location, minYears, maxRate, availableByDate, blockedByResource]);

  const countLine =
    filtered.length === resources.length ? (
      <>
        Showing{" "}
        <span className="font-semibold tabular-nums" style={{ color: ACCENT }}>
          {filtered.length}
        </span>{" "}
        verified {filtered.length === 1 ? "professional" : "professionals"}
      </>
    ) : (
      <>
        Showing{" "}
        <span className="font-semibold tabular-nums" style={{ color: ACCENT }}>
          {filtered.length}
        </span>{" "}
        <span className="text-white/45">of {resources.length}</span> verified professionals
      </>
    );

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-6 md:p-8">
        <p className="text-sm text-white/55">{countLine}</p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-2 md:col-span-2 lg:col-span-2">
            <span className={fieldLabelClass}>Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Role, title, or bio"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={fieldLabelClass}>Location</span>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass}>
              <option value="">All locations</option>
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className={fieldLabelClass}>Min. years experience</span>
            <input
              type="number"
              min={0}
              step={1}
              value={minYears}
              onChange={(e) => setMinYears(e.target.value)}
              placeholder="Any"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
            <span className={fieldLabelClass}>Max. hourly rate (ZAR)</span>
            <input
              type="number"
              min={0}
              step={50}
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              placeholder="Any"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2 lg:col-span-2">
            <span className={fieldLabelClass}>Available by date</span>
            <input
              type="date"
              value={availableByDate}
              onChange={(e) => setAvailableByDate(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-black/25 px-6 py-10 text-center backdrop-blur-md">
          <p className="text-base font-semibold text-white/90">No talent matches your filters</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/55">
            Try changing your search or availability date.
          </p>
        </div>
      ) : (
        <MarketplaceConsultantGrid
          resources={filtered}
          activeAvailabilityDate={availableByDate.trim()}
        />
      )}
    </div>
  );
}
