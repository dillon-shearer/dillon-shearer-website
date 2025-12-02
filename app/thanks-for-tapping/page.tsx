import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CopyContactCard } from '@/app/components/copy-contact-card'

export const metadata: Metadata = {
  title: 'Thanks for tapping | DWD',
  description: 'A private follow-up page for in-person introductions to Dillon Shearer.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Great meeting you | Data With Dillon',
    description: 'Continue the conversation with Dillon Shearer after tapping his NFC card.',
    type: 'website',
  },
}

type SecondaryAction = {
  label: string
  href: string
  helper: string
  isExternal?: boolean
  analyticsId: string
}

type QuickFact = {
  label: string
  value: string
}

const primaryAction = {
  label: 'Send a quick note',
  href: 'mailto:dillon@datawithdillon.com?subject=Great%20meeting%20you',
  helper: 'Goes straight to my inbox. Mention where we met and I’ll reply within a day.',
  analyticsId: 'nfc-primary-email',
}

const secondaryActions: SecondaryAction[] = [
  {
    label: 'LinkedIn DM',
    href: 'https://www.linkedin.com/in/dillonshearer/',
    helper: 'Keep the thread going on LinkedIn.',
    isExternal: true,
    analyticsId: 'nfc-linkedin',
  },
  {
    label: 'See live demos',
    href: '/demos',
    helper: 'Preview the builds we talked through.',
    analyticsId: 'nfc-demos',
  },
  {
    label: 'Download resume',
    href: '/Dillon_Shearer_Resume.pdf',
    helper: 'One-page snapshot of recent work.',
    isExternal: true,
    analyticsId: 'nfc-resume',
  },
]

const quickFacts: QuickFact[] = [
  { label: 'Focus', value: 'Analytics, copilots, and automation for health teams' },
  { label: 'Latest build', value: 'Ops-grade dashboards that ingest daily clinical feeds' },
  { label: 'Location', value: 'Atlanta-based, collaborating remotely across time zones' },
]

export default function ThanksForTappingPage() {
  return (
    <div className="bg-black text-white">
      <article
        className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-16"
      >
        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 sm:p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/60 sm:text-sm">
                Thanks for tapping in
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-balance sm:text-4xl">
                I&apos;m <span className="font-bold">Dillon Shearer</span> - it was great to meet you! Let&apos;s keep the momentum going while the conversation is fresh.
              </h1>
              <p className="mt-4 text-base text-white/85 sm:text-lg">
                I build analytics portals, enablement workflows, and copilots that health and life science teams depend on daily. This page is reserved for the people I meet in person.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {quickFacts.map(fact => (
                  <div
                    key={fact.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 sm:text-base"
                  >
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/60">
                      {fact.label}
                    </p>
                    <p className="mt-1 font-medium">{fact.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex flex-col items-center justify-center">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl">
                <Image
                  src="/ds.jpg"
                  alt="Dillon Shearer portrait"
                  width={280}
                  height={280}
                  priority
                  className="h-auto w-full max-w-xs rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 sm:text-base">
              Translating in-person context into next steps: I’m currently helping clinical
              operations teams connect intake, approvals, and monitoring so nothing slips.
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/30 via-blue-500/20 to-transparent p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/70 sm:text-sm">
              Primary next step
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-balance sm:text-[26px]">
              Drop a line while we&apos;re both still in event-mode.
            </h2>
            <p className="mt-3 text-base text-white/80">
              {primaryAction.helper}
            </p>
            <a
              href={primaryAction.href}
              className="mt-6 inline-flex min-h-[56px] items-center justify-center gap-3 rounded-2xl bg-white text-black px-6 py-4 text-lg font-semibold tracking-wide transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              data-analytics-id={primaryAction.analyticsId}
            >
              {primaryAction.label}
              <span aria-hidden className="text-xl">↗</span>
            </a>
            <p className="mt-4 text-sm text-white/60">
              No signal? Save <span className="font-mono text-white">dillon@datawithdillon.com</span>{' '}
              and email me once you&apos;re back online.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/70 sm:text-sm">Secondary paths</p>
            <ul className="mt-4 space-y-4">
              {secondaryActions.map(action => {
                const content = (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold">{action.label}</span>
                      <span aria-hidden className="text-lg transition-transform duration-200 group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/70">{action.helper}</p>
                  </>
                )

                return (
                  <li key={action.label}>
                    {action.isExternal ? (
                      <a
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-2xl border border-white/10 bg-transparent px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40"
                        data-analytics-id={action.analyticsId}
                      >
                        {content}
                      </a>
                    ) : (
                      <Link
                        href={action.href}
                        className="group block rounded-2xl border border-white/10 bg-transparent px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40"
                        data-analytics-id={action.analyticsId}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                )
              })}
              <li>
                <CopyContactCard
                  label="Save my number"
                  helper="Tap to copy my cell for text or call."
                  value="+14704543924"
                  displayValue="+1 (470) 454-3924"
                  analyticsId="nfc-phone"
                />
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 px-4 py-5 text-xs uppercase tracking-[0.35em] text-white/60">
          Need something else? Reply with what success looks like and I’ll send options within 24h.
        </section>
      </article>
    </div>
  )
}
