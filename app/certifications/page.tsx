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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="text-center mb-16">
          <p className="section-label">
            Training Platform
          </p>
          <h1 className="section-title">
            Certification Prep
          </h1>
          <p className="section-subtitle max-w-3xl mx-auto">
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
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  {/* Provider Badge */}
                  <span className="badge-base badge-primary inline-block mb-3">
                    {cert.provider}
                  </span>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-white mb-2">
                    {cert.shortName}: {cert.name}
                  </h2>

                  {/* Description */}
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {cert.description}
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{cert.topics.length} Topics</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{cert.totalQuestions} Questions</span>
                    </div>
                    {cert.passingScore && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Passing: {cert.passingScore}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Note */}
        <p className="text-center text-white/40 text-sm mt-6 max-w-2xl mx-auto">
          Questions are continuously being added as I study.
          Progress is saved locally in your browser.
        </p>
      </div>
    </div>
  )
}
