// app/demos/data-access-portal/page.tsx
import { Fragment } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Access Dashboard | DWD',
  description:
    'Walk through the entire data access workflow: submit a request, review it in the admin console, and unlock scoped API keys.',
};

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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-16">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Demo - Data Access Portal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">
            Follow the full Gym Dataset access workflow
          </h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            This screen mirrors our real intake loop: a requester submits a justification,
            an admin verifies compliance, and the approved researcher lands in the gated API
            workspace with a scoped key.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            {[
              { label: 'Submit access request', caption: 'Requester' },
              { label: 'Admin review + decision', caption: 'Admin' },
              { label: 'Retrieve scoped API key', caption: 'Requester' },
            ].map((step, idx, arr) => (
              <Fragment key={step.label}>
                <div className="flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-950/60 px-4 py-2 text-[10px] tracking-[0.25em] text-zinc-500">
                  <span className="text-xs font-semibold text-zinc-200">{`0${
                    idx + 1
                  }`}</span>
                  <span className="hidden text-[10px] tracking-[0.3em] text-zinc-600 sm:inline">
                    {step.caption}
                  </span>
                  <span className="text-[11px] tracking-normal text-zinc-200">
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <span className="text-sm text-zinc-700">→</span>
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-zinc-900/50 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/80">
                Requester lane
              </p>
              <h2 className="text-2xl font-semibold text-zinc-50">
                Everything a researcher sees from intake to API pull
              </h2>
              <p className="text-sm text-zinc-300">
                Two touchpoints: the access form that captures intent and controls, then the
                download/API room that unlocks once the approval flag flips to true.
              </p>
            </div>
            <div className="relative mt-6">
              <div className="pointer-events-none absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-emerald-500/0 via-emerald-500/40 to-violet-500/30 lg:block" />
              <div className="space-y-6">
                <LaneStep
                  step="01"
                  persona="Requester"
                  title="Submit the Gym dataset access request"
                  description="Collects PI info, institution, and justification so risk can be evaluated quickly."
                  bullets={[
                    'Mirrors the same DAR checklist we use internally.',
                    'Validates required metadata before anything is saved.',
                    'Hands the record to the admin grid instantly.',
                  ]}
                  cta={{
                    href: '/demos/data-access-portal/request',
                    label: 'Open intake form',
                    variant: 'emerald',
                  }}
                />
                <LaneStep
                  step="03"
                  persona="Requester"
                  title="Use the approved API key in the secure room"
                  description="After an approval, the researcher lands in the download/API workspace with scopes tied to their request."
                  bullets={[
                    'Shows the exact key that was just minted by the admin.',
                    'Guides them to the proper endpoint with example calls.',
                    'Keeps audit breadcrumbs so keys can be revoked later.',
                  ]}
                  cta={{
                    href: '/demos/data-access-portal/data-download',
                    label: 'Visit API workspace',
                    variant: 'violet',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-zinc-950/70 to-zinc-900/40 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-400/80">
                Admin gate
              </p>
              <h2 className="text-2xl font-semibold text-zinc-50">
                Review, decide, and issue scoped credentials
              </h2>
              <p className="text-sm text-zinc-300">
                The admin table is where statuses move from submitted → in review → approved
                or denied, complete with audit notes and instant key generation.
              </p>
            </div>
            <div className="mt-6 space-y-6">
              <LaneStep
                step="02"
                persona="Admin"
                title="Validate controls and approve or reject"
                description="Work the queue, edit metadata, and trigger the same key creation call the requester will later use."
                bullets={[
                  'Filter by status, country, or PI to triage quickly.',
                  'Inline edits before toggling to approved or denied.',
                  'Approval path mints & stores the API key; denial logs a reason.',
                ]}
                cta={{
                  href: '/demos/data-access-portal/admin',
                  label: 'Open admin console',
                  variant: 'sky',
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <HighlightCard
            label="Single source of truth"
            body="The request table powers both sides, so status updates and audit notes propagate instantly."
          />
          <HighlightCard
            label="Realistic decision states"
            body="Submitted → In review → Approved/Denied mirrors compliance gating and informs the requester view right away."
          />
          <HighlightCard
            label="Scoped delivery"
            body="API keys inherit dataset scopes so the researcher only sees the Gym assets they were approved to use."
          />
        </div>
      </div>
    </div>
  );
}

type LaneStepProps = {
  step: string;
  persona: string;
  title: string;
  description: string;
  bullets: string[];
  cta: { href: string; label: string; variant: keyof typeof ACCENT_STYLES };
};

function LaneStep({ step, persona, title, description, bullets, cta }: LaneStepProps) {
  const accent = ACCENT_STYLES[cta.variant];

  return (
    <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/60 p-5 pl-6 shadow-inner shadow-black/20">
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full border bg-zinc-950 text-sm font-semibold ${accent.ring} ${accent.text}`}
        >
          {step}
        </span>
        <span className="text-zinc-500">{persona}</span>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-zinc-50">{title}</h3>
      <p className="mt-2 text-sm text-zinc-300">{description}</p>
      <ul className="mt-4 space-y-2 text-xs text-zinc-400">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <span className={`mt-1 h-1.5 w-1.5 rounded-full ${accent.dot}`} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={`mt-5 inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium transition ${accent.button}`}
      >
        {cta.label}
      </Link>
    </div>
  );
}

function HighlightCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-900/70 bg-zinc-950/40 p-5 shadow-inner shadow-black/20">
      <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-3 text-sm text-zinc-300">{body}</p>
    </div>
  );
}
