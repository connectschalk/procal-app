import Link from "next/link";

export type MarketplaceResource = {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  hourly_rate: number | null;
  years_experience: number | null;
  bio: string | null;
};

function formatRate(rate: number | null) {
  if (rate == null) return "Rate on request";
  return `${new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(rate)} / hr`;
}

export function MarketplaceConsultantGrid({ resources }: { resources: MarketplaceResource[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <article
          key={resource.id}
          className="flex h-full flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{resource.name}</h2>
            <p className="text-sm text-zinc-600">{resource.headline ?? "Consultant"}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Location</dt>
              <dd className="font-medium text-zinc-800">{resource.location ?? "Remote"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Rate</dt>
              <dd className="font-medium text-zinc-800">{formatRate(resource.hourly_rate)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-zinc-500">Experience</dt>
              <dd className="font-medium text-zinc-800">
                {resource.years_experience != null
                  ? `${resource.years_experience} years`
                  : "Experience not listed"}
              </dd>
            </div>
          </dl>

          <p className="text-sm leading-6 text-zinc-700">{resource.bio ?? "No bio provided."}</p>

          <div className="mt-auto border-t border-zinc-100 pt-4">
            <Link
              href={`/consultants/${resource.id}`}
              className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              View profile
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
