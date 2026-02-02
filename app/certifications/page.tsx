import { Metadata } from 'next'
import Link from 'next/link'
import { getAllCertifications } from '@/lib/certifications'

export const metadata: Metadata = {
  title: 'Certifications | DWD',
  description:
    'Interactive training platform for IT certifications. Practice questions, track progress, and master the material.',
  openGraph: {
    title: 'Certifications | Data With Dillon',
    description:
      'Interactive training platform for IT certifications. Practice questions, track progress, and master the material.',
    type: 'website',
  },
}

export default function CertificationsPage() {
  const certifications = getAllCertifications()

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <header className="text-center mb-10 sm:mb-16">
          <p className="section-label text-xs sm:text-sm">
            Training Platform
          </p>
          <h1 className="section-title text-3xl sm:text-4xl md:text-5xl">
            Certification Prep
          </h1>
          <p className="section-subtitle max-w-3xl mx-auto text-sm sm:text-base">
            Interactive study materials for IT certifications. Practice with realistic questions,
            track your progress, and review detailed explanations.
          </p>
        </header>

        {/* Certifications Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 gap-6">
          {certifications.map((cert) => (
            <Link
              key={cert.slug}
              href={`/certifications/${cert.slug}`}
              className="card-base card-hover block"
            >
              {/* Header Row */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  {/* Provider Badge */}
                  <span className="badge-base badge-primary inline-block mb-2 sm:mb-3 text-xs">
                    {cert.provider}
                  </span>

                  {/* Title */}
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-2 break-words">
                    {cert.shortName}: {cert.name}
                  </h2>

                  {/* Description */}
                  <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {cert.description}
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="whitespace-nowrap">{cert.topics.length} Topics</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="whitespace-nowrap">{cert.totalQuestions} Questions</span>
                    </div>
                    {cert.passingScore && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="whitespace-nowrap">Passing: {cert.passingScore}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Note */}
        <p className="text-center text-white/40 text-xs sm:text-sm mt-6 mb-0 max-w-2xl mx-auto px-4">
          Questions are continuously being added as I study.
          Progress is saved locally in your browser.
        </p>
      </div>
    </div>
  )
}
