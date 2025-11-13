// app/demos/data-access-portal/page.tsx
import Link from 'next/link';

export default function DataAccessPortalLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Demo • Data Access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
            Data Access Portal – Gym Dataset
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            A realistic workflow for managing data access requests, approvals, and
            API-key–gated distribution of my own gym dataset.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/demos/data-access-portal/request"
            className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/30 transition hover:border-emerald-500/70 hover:bg-zinc-900/70"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-50">
                Submit Data Access Request
              </h2>
              <span className="text-xs text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Fill in contact, project, and data needs to request scoped access to the gym dataset.
            </p>
          </Link>

          <Link
            href="/demos/data-access-portal/admin"
            className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/30 transition hover:border-sky-500/70 hover:bg-zinc-900/70"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-50">
                Admin – Requests & Decisions
              </h2>
              <span className="text-xs text-sky-400 group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Review submitted requests, clean up metadata, approve or deny, and issue API keys.
            </p>
          </Link>

          <Link
            href="/demos/data-access-portal/data-download"
            className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-sm shadow-black/30 transition hover:border-violet-500/70 hover:bg-zinc-900/70"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-50">
                Data Download / API
              </h2>
              <span className="text-xs text-violet-400 group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Paste an API key and pull only the gym data that was approved for that request.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
