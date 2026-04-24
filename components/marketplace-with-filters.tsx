"use client";

import { useMemo, useState } from "react";
import {
  MarketplaceConsultantGrid,
  type MarketplaceResource,
} from "@/components/marketplace-consultant-grid";

function matchesSearch(resource: MarketplaceResource, query: string) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [resource.name, resource.headline ?? "", resource.bio ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function MarketplaceWithFilters({ resources }: { resources: MarketplaceResource[] }) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [minYears, setMinYears] = useState("");
  const [maxRate, setMaxRate] = useState("");

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

      return true;
    });
  }, [resources, search, location, minYears, maxRate]);

  const countWord = (n: number) => (n === 1 ? "consultant" : "consultants");
  const countLabel =
    filtered.length === resources.length
      ? `Showing ${filtered.length} ${countWord(filtered.length)}`
      : `Showing ${filtered.length} of ${resources.length} ${countWord(resources.length)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 md:p-6">
        <p className="text-sm font-medium text-zinc-900">{countLabel}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm md:col-span-2 lg:col-span-2">
            <span className="font-medium text-zinc-700">Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, headline, or bio"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">Location</span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 focus:ring-2"
            >
              <option value="">All locations</option>
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-700">Min. years experience</span>
            <input
              type="number"
              min={0}
              step={1}
              value={minYears}
              onChange={(e) => setMinYears(e.target.value)}
              placeholder="Any"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm md:col-span-2 lg:col-span-1">
            <span className="font-medium text-zinc-700">Max. hourly rate (ZAR)</span>
            <input
              type="number"
              min={0}
              step={50}
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              placeholder="Any"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-950 placeholder:text-zinc-400 focus:ring-2"
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          No consultants match your filters.
        </p>
      ) : (
        <MarketplaceConsultantGrid resources={filtered} />
      )}
    </div>
  );
}
