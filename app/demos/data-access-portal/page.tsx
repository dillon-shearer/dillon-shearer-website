// app/demos/data-access-portal/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Access Dashboard | DWD',
  description:
    'Walk through the entire data access workflow: submit a request with inline validation, review it in the admin console with audit history, and unlock scoped API keys.',
};

const HERO_PREVIEWS = [
  {
    label: 'Requester intake',
    title: 'Submit a governed DAR',
    description: 'PI identity, proposal, controls, and dataset scopes with real-time validation.',
    href: '/demos/data-access-portal/request',
    accent: 'emerald' as const,
  },
  {
    label: 'Admin console',
    title: 'Decide + issue keys',
    description: 'Filter, triage, mint credentials, and inspect full audit history.',
    href: '/demos/data-access-portal/admin',
    accent: 'sky' as const,
  },
  {
    label: 'Download room',
    title: 'Deliver scoped data',
    description: 'Unlock CSV / JSON exports that mirror the approved slices.',
    href: '/demos/data-access-portal/data-download',
    accent: 'violet' as const,
  },
] as const;

const ACCENT_STYLES = {
  emerald: {
    text: 'text-emerald-200',
    ring: 'border-emerald-400/70',
    dot: 'bg-emerald-400/80',
    button:
      'border border-emerald-400/70 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20',
  },
  sky: {
    text: 'text-sky-200',
    ring: 'border-sky-400/70',
    dot: 'bg-sky-400/80',
    button: 'border border-sky-400/70 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20',
  },
  violet: {
    text: 'text-violet-200',
    ring: 'border-violet-400/70',
    dot: 'bg-violet-400/80',
    button:
      'border border-violet-400/70 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20',
  },
} as const;

export default function DataAccessPortalLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-4 py-16">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Demo - Data Access Portal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">
            Follow the full Gym Dataset access workflow
          </h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            This mirrors the real intake loop: requesters submit with inline validation,
            admins review with a persistent audit trail, and approved researchers land in the
            gated API workspace with a scoped key. Tap into each surface below to see the
            workflow in motion.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {HERO_PREVIEWS.map((preview, index) => (
              <HeroPreviewCard key={preview.label} preview={preview} step={index + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type HeroPreview = (typeof HERO_PREVIEWS)[number];

function HeroPreviewCard({ preview, step }: { preview: HeroPreview; step: number }) {
  const accent = ACCENT_STYLES[preview.accent];

  return (
    <Link
      href={preview.href}
      className="group flex h-full min-h-[420px] flex-col rounded-2xl border border-zinc-900/60 bg-gradient-to-b from-zinc-950 via-zinc-950/70 to-zinc-900/40 p-4"
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-zinc-500">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${accent.ring} ${accent.text}`}
          >
            {String(step).padStart(2, '0')}
          </span>
          <span>{preview.label}</span>
        </div>
        <span className={`rounded-full border px-2 py-0.5 ${accent.ring} ${accent.text}`}>
          View
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-zinc-50">{preview.title}</h3>
      <p className="mt-2 text-xs text-zinc-400">{preview.description}</p>
      <MiniScreen accent={accent} preview={preview} />
      <span className={`mt-3 text-[11px] font-medium text-zinc-200 ${accent.text}`}>
        Explore &rarr;
      </span>
    </Link>
  );
}

type AccentStyle = (typeof ACCENT_STYLES)[keyof typeof ACCENT_STYLES];

function MiniScreen({ accent, preview }: { accent: AccentStyle; preview: HeroPreview }) {
  if (preview.href.includes('/request')) {
    return (
      <div className="mt-4 flex flex-1 flex-col rounded-xl border border-zinc-900 bg-zinc-950/80 p-3 text-[10px] text-zinc-100">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400/60" />
          <span className="h-2 w-2 rounded-full bg-amber-400/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
        </div>
        <div className="mt-3 flex flex-1 flex-col gap-2 text-[9px] text-zinc-300">
          <div className="rounded-xl border border-zinc-900/70 bg-zinc-950/60 p-2">
            <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-500">PI & org</p>
            <p className="text-[10px] font-semibold text-zinc-50">Sara Bell · Peak Lab (US)</p>
            <p>sara.bell@peaklab.io · +1 (312) 555-4471</p>
            <p>Timeline · Jun 20 → Sep 15</p>
          </div>
          <div className="rounded-lg border border-zinc-900/70 bg-zinc-950/60 p-2 leading-snug text-zinc-300">
            <p className="text-[8px] uppercase tracking-[0.2em] text-zinc-500">Data use proposal</p>
            Validate auto-RIR suggestions with set metrics and coached adjustments across collegiate rowers.
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'set_metrics', badge: 'L2' },
              { label: 'workout_sessions', badge: 'L2' },
              { label: 'aggregates', badge: 'L1' },
            ].map((dataset) => (
              <span
                key={dataset.label}
                className="flex items-center gap-1 rounded-full border border-zinc-800/70 px-2 py-0.5 text-[9px] text-zinc-200"
              >
                {dataset.label}
                <span className="rounded-full border border-zinc-700 px-1 text-[8px] text-zinc-400">
                  {dataset.badge}
                </span>
              </span>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <button className="rounded-full border border-zinc-800/80 px-2 py-1 text-[9px] text-zinc-300">
              Save draft
            </button>
            <button className="rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-100">
              Submit DAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (preview.href.includes('/admin')) {
    return (
      <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/80 p-3 text-[10px] text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400/60" />
          <span className="h-2 w-2 rounded-full bg-amber-400/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
        </div>
        <div className="mt-3 grid gap-2">
          <div className="grid grid-cols-2 gap-1">
            {['Submitted', 'In Review', 'Approved', 'Denied'].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-zinc-900 bg-zinc-950/70 p-2 text-center text-[9px]"
              >
                <p className={`text-[8px] uppercase tracking-[0.2em] ${accent.text}`}>{label}</p>
                <p className="mt-1 text-sm text-zinc-50">{Math.floor(Math.random() * 4)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-2 text-[9px] text-zinc-300">
            <div className="mb-1 grid grid-cols-3 text-center text-[8px] uppercase tracking-[0.2em] text-zinc-500">
              <span>PI</span>
              <span>Institution</span>
              <span>Status</span>
            </div>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="mt-1 grid grid-cols-3 items-center rounded border border-zinc-900/60 bg-zinc-950/50 px-2 py-1 text-center text-[9px]"
              >
                <span className="text-zinc-200">H. Patel</span>
                <span className="text-zinc-400">Stanford</span>
                <span
                  className={`rounded-full border px-2 py-[1px] text-[8px] ${
                    row === 0
                      ? 'border-emerald-500/70 text-emerald-200'
                      : row === 1
                        ? 'border-zinc-700 text-zinc-200'
                        : 'border-sky-500/70 text-sky-200'
                  }`}
                >
                  {row === 0 ? 'Approved' : row === 1 ? 'Submitted' : 'In Review'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/80 p-3 text-[10px] text-zinc-400">
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-red-400/60" />
        <span className="h-2 w-2 rounded-full bg-amber-400/60" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex flex-col gap-1">
          <div className="h-2 rounded bg-zinc-800/70" />
          <div className="rounded-lg border border-zinc-900 bg-zinc-950/70 p-1 text-[9px]">
            <p className="text-emerald-200">API key: dar_xxx</p>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-2">
          <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-zinc-500">
            <span>Dataset</span>
            <span>Status</span>
          </div>
          {[0, 1].map((card) => (
            <div
              key={card}
              className="mt-1 flex items-center justify-between rounded border border-zinc-900/60 bg-zinc-950/50 px-2 py-1 text-[9px]"
            >
              <span className="text-zinc-200">Set metrics</span>
              <span className={`rounded-full border px-2 py-[1px] text-[8px] ${accent.ring}`}>
                CSV
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-2">
          <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-zinc-500">
            <span>Visual bundle</span>
            <span>Status</span>
          </div>
          {[0, 1].map((visual) => (
            <div
              key={visual}
              className="mt-1 flex items-center justify-between rounded border border-zinc-900/60 bg-zinc-950/50 px-2 py-1 text-[9px]"
            >
              <span className="text-zinc-200">Weekly volume</span>
              <span className={`rounded-full border px-2 py-[1px] text-[8px] ${accent.ring}`}>
                ZIP
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
