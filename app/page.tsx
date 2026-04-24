import Link from "next/link";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-slate-950/70" aria-hidden />

      <header className="relative z-20 flex items-center justify-end gap-6 px-6 py-6 md:px-10">
        <Link
          href="/marketplace"
          className="text-sm font-medium text-white/80 transition-colors hover:text-white"
        >
          Marketplace
        </Link>
        <Link
          href="/create"
          className="text-sm font-medium text-white/80 transition-colors hover:text-white"
        >
          For talent
        </Link>
        <Link
          href="/admin/resources"
          className="text-sm font-medium text-white/80 transition-colors hover:text-white"
        >
          Admin
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-8 md:px-8">
        <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-12">
          <div className="mb-8 flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold tracking-tight text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
              aria-hidden
            >
              P
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Procal
            </span>
          </div>

          <h1 className="text-center text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl md:leading-tight">
            Connecting Talent with Opportunity
          </h1>
          <p className="mt-4 text-center text-base leading-relaxed text-white/75 md:text-lg">
            Discover trusted consultants and specialists.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/marketplace"
              className="flex min-h-[3.25rem] items-center justify-center rounded-2xl bg-orange-500 px-6 py-4 text-center text-base font-semibold text-white shadow-lg shadow-orange-900/30 transition hover:bg-orange-600 hover:shadow-xl"
            >
              I&apos;m a Company
            </Link>
            <Link
              href="/create"
              className="flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-white/10 bg-slate-900 px-6 py-4 text-center text-base font-semibold text-white shadow-lg shadow-black/30 transition hover:bg-slate-800"
            >
              I&apos;m Talent
            </Link>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <Link
              href="/company"
              className="text-sm text-white/55 underline-offset-4 transition-colors hover:text-white/90 hover:underline"
            >
              Already requested talent? Open your company dashboard
            </Link>
            <Link
              href="/consultant"
              className="text-sm text-white/55 underline-offset-4 transition-colors hover:text-white/90 hover:underline"
            >
              Already listed? Open your consultant dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
