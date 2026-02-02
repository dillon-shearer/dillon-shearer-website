import type { Metadata } from 'next'
import Link from 'next/link'
import { CopyContactCard } from '@/app/components/copy-contact-card'

export const metadata: Metadata = {
  title: 'Thanks for chatting | DWD',
  description: 'Let\'s stay connected. Multiple ways to reach Dillon Shearer after meeting in person.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Thanks for chatting | Data With Dillon',
    description: 'Let\'s stay connected. Multiple ways to reach Dillon Shearer.',
    type: 'website',
  },
}

type ContactOption = {
  title: string
  description: string
  buttonText: string
  href?: string
  icon: string
  analyticsId: string
  isExternal?: boolean
  isSpecial?: boolean
  isPrimary?: boolean
}

type QuickFact = {
  label: string
  value: string
}

const contactOptions: ContactOption[] = [
  {
    title: 'Send an Email',
    description: 'Usually reply within 24 hours. Mention where we met!',
    buttonText: 'Send Email',
    href: 'mailto:dillon@datawithdillon.com?subject=Great%20meeting%20you',
    icon: '',
    analyticsId: 'nfc-primary-email',
    isExternal: true,
    isPrimary: true,
  },
  {
    title: 'Save My Number',
    description: 'Text or call anytime',
    buttonText: 'Copy Number',
    icon: '',
    analyticsId: 'nfc-phone',
    isSpecial: true,
  },
  {
    title: 'Connect on LinkedIn',
    description: 'Let\'s stay in touch professionally',
    buttonText: 'View Profile',
    href: 'https://www.linkedin.com/in/dillonshearer/',
    icon: '',
    analyticsId: 'nfc-linkedin',
    isExternal: true,
  },
  {
    title: 'View My Work',
    description: 'See live projects and examples',
    buttonText: 'Browse Demos',
    href: '/demos',
    icon: '',
    analyticsId: 'nfc-demos-alt',
    isExternal: false,
  },
]

const quickFacts: QuickFact[] = [
  { label: 'Focus', value: 'Custom solutions that save time' },
  { label: 'Latest build', value: 'Gym member dashboard with real-time analytics' },
  { label: 'Location', value: 'Atlanta, GA' },
]

const additionalResources = [
  {
    label: 'See what I build',
    href: '/demos',
    helper: 'Live demos and interactive examples',
    analyticsId: 'nfc-demos',
  },
  {
    label: 'Download my resume',
    href: '/Dillon_Shearer_Resume.pdf',
    helper: 'One-page overview of recent work',
    analyticsId: 'nfc-resume',
    isExternal: true,
  },
]

export default function ThanksForTappingPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <article
        className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-5 pb-12 pt-8"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top))',
          paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Header Section */}
        <section className="text-center">
          <h1 className="text-3xl font-bold leading-tight text-balance text-white">
            Great to Meet You!
          </h1>
          <p className="mx-auto mt-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            I build custom software that saves time and simplifies complex work.
            Let's continue the conversation.
          </p>

          {/* Quick Facts */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {quickFacts.map((fact, index) => (
              <div
                key={fact.label}
                className={`rounded-xl px-4 py-3 text-center ${
                  index === 2 ? 'col-span-2' : ''
                }`}
                style={{
                  borderWidth: '1px',
                  borderColor: 'var(--border-primary)',
                  backgroundColor: 'var(--bg-subtle)'
                }}
              >
                <p className="text-label" style={{ color: 'var(--text-tertiary)' }}>
                  {fact.label}
                </p>
                <p className="mt-1.5 text-sm font-medium leading-snug text-white">{fact.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Options - Equal Weight */}
        <section>
          <h2 className="mb-5 text-center text-label" style={{ color: 'var(--text-tertiary)' }}>
            Let's stay connected
          </h2>
          <div className="grid gap-4">
            {contactOptions.map(option => {
              if (option.isSpecial) {
                // Phone number with copy functionality
                return (
                  <div key={option.title} className="flex flex-col">
                    <div
                      className="flex flex-col rounded-xl px-5 py-4 text-center transition-all duration-200 active:scale-[0.98]"
                      style={{
                        borderWidth: '1px',
                        borderColor: 'var(--border-primary)',
                        backgroundColor: 'var(--bg-subtle)'
                      }}
                    >
                      <h3 className="text-lg font-semibold text-white">{option.title}</h3>
                      <p className="mt-1.5 text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                        {option.description}
                      </p>
                      <div className="mt-3">
                        <CopyContactCard
                          label={option.buttonText}
                          helper=""
                          value="+14704543924"
                          displayValue="+1 (470) 454-3924"
                          analyticsId={option.analyticsId}
                          variant="inline"
                        />
                      </div>
                    </div>
                  </div>
                )
              }

              // Regular link cards
              const cardStyle = option.isPrimary
                ? {
                    borderWidth: '1px',
                    borderColor: 'var(--border-accent)',
                    backgroundColor: 'rgba(84, 179, 214, 0.05)'
                  }
                : {
                    borderWidth: '1px',
                    borderColor: 'var(--border-primary)',
                    backgroundColor: 'var(--bg-subtle)'
                  }

              const cardClasses = 'group flex flex-col rounded-xl px-5 py-4 text-center transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

              const LinkComponent = option.isExternal ? 'a' : Link
              const linkProps = option.isExternal
                ? {
                    href: option.href,
                    target: '_blank' as const,
                    rel: 'noopener noreferrer',
                    'aria-label': `${option.title} (opens in new tab)`,
                  }
                : {
                    href: option.href || '/',
                    prefetch: true,
                  }

              return (
                <LinkComponent
                  key={option.title}
                  {...linkProps}
                  className={cardClasses}
                  style={cardStyle}
                  data-analytics-id={option.analyticsId}
                >
                  <h3 className="text-lg font-semibold text-white">{option.title}</h3>
                  <p className="mt-1.5 text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
                    {option.description}
                  </p>
                  <div className="mt-3 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {option.buttonText}
                    </span>
                    <span
                      aria-hidden
                      className="ml-2 text-lg transition-transform duration-200 group-active:translate-x-1"
                    >
                      →
                    </span>
                    <span className="sr-only">Opens link</span>
                  </div>
                </LinkComponent>
              )
            })}
          </div>
        </section>

        {/* Additional Resources */}
        <section
          className="rounded-xl p-5"
          style={{
            borderWidth: '1px',
            borderColor: 'var(--border-primary)',
            backgroundColor: 'var(--bg-subtle)'
          }}
        >
          <h2 className="mb-4 text-center text-label" style={{ color: 'var(--text-tertiary)' }}>
            Additional resources
          </h2>
          <div className="grid gap-3">
            {additionalResources.map(resource => {
              const content = (
                <>
                  <div className="flex items-center justify-center">
                    <span className="text-base font-semibold text-white">{resource.label}</span>
                    <span
                      aria-hidden
                      className="ml-2 text-lg transition-transform duration-200 group-active:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                  <p className="mt-1 text-center text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {resource.helper}
                  </p>
                </>
              )

              const ResourceLink = resource.isExternal ? 'a' : Link
              const resourceProps = resource.isExternal
                ? {
                    href: resource.href,
                    target: '_blank' as const,
                    rel: 'noopener noreferrer',
                    'aria-label': `${resource.label} (opens in new tab)`,
                  }
                : {
                    href: resource.href,
                    prefetch: true,
                  }

              return (
                <ResourceLink
                  key={resource.label}
                  {...resourceProps}
                  className="group block rounded-xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98]"
                  style={{
                    borderWidth: '1px',
                    borderColor: 'var(--border-primary)',
                    backgroundColor: 'transparent'
                  }}
                  data-analytics-id={resource.analyticsId}
                >
                  {content}
                </ResourceLink>
              )
            })}
          </div>
        </section>
      </article>
    </div>
  )
}
