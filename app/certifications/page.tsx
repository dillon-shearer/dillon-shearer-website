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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-[#54b3d6] mb-2">
            Training Platform
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold mb-3">
            Certification Prep
          </h1>
          <p className="text-base text-white/80 max-w-3xl mx-auto leading-relaxed">
            Interactive study materials for IT certifications. Practice with realistic questions,
            track your progress, and review detailed explanations.
          </p>
        </header>

        {/* Certifications Grid */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 gap-3">
          {certifications.map((cert) => (
            <Link
              key={cert.slug}
              href={`/certifications/${cert.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/[0.08] to-transparent p-5 transition-all duration-300 hover:border-white/30 hover:shadow-[0_8px_40px_rgba(84,179,214,0.12)]"
            >
              <div className="relative z-10">
                {/* Header Row */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    {/* Provider Badge */}
                    <span className="inline-block px-2.5 py-0.5 text-xs uppercase tracking-widest text-[#54b3d6] bg-[#54b3d6]/10 rounded-full mb-2">
                      {cert.provider}
                    </span>

                    {/* Title */}
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {cert.shortName}: {cert.name}
                    </h2>

                    {/* Description */}
                    <p className="text-sm text-white/60 mb-3">
                      {cert.description}
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm text-white/50">
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

                  {/* CTA Button */}
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-white/30 group-hover:border-white text-white whitespace-nowrap">
                    Start Training
                    <svg
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>

                {/* Topics Preview */}
                <div className="border-t border-white/10 pt-3 mt-3">
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
                    Topics Covered
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {cert.topics.map((topic) => (
                      <span
                        key={topic.id}
                        className="px-2.5 py-1 text-xs bg-white/5 text-white/60 rounded-lg border border-white/5 transition-colors duration-200 group-hover:text-white/80 group-hover:border-white/10"
                      >
                        {topic.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subtle gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/0 to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
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
