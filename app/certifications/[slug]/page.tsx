'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCertificationBySlug } from '@/lib/certifications'

export default function CertificationPage() {
  const params = useParams()
  const slug = params.slug as string
  const certification = getCertificationBySlug(slug)

  if (!certification) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Certification Not Found</h1>
          <Link
            href="/certifications"
            className="text-[#54b3d6] hover:underline"
          >
            Return to Certifications
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Back Link */}
        <Link
          href="/certifications"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Certifications
        </Link>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-start gap-4 mb-4">
            {certification.icon && (
              <div className="text-6xl">{certification.icon}</div>
            )}
            <div className="flex-1">
              <span className="inline-block px-3 py-1 text-xs uppercase tracking-widest text-[#54b3d6] bg-[#54b3d6]/10 rounded-full mb-3">
                {certification.provider}
              </span>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                {certification.shortName}: {certification.name}
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                {certification.description}
              </p>
            </div>
          </div>
        </header>

        {/* Topics Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Study Topics</h2>

          <div className="grid grid-cols-1 gap-4">
            {certification.topics.map((topic) => {
              return (
                <Link
                  key={topic.id}
                  href={`/certifications/${slug}/${topic.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 transition-all duration-300 hover:border-white/20 hover:shadow-[0_8px_40px_rgba(84,179,214,0.08)]"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#54b3d6] transition-colors">
                        {topic.title}
                      </h3>
                      <p className="text-white/60 mb-4">
                        {topic.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-white/50">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{topic.questions.length} questions</span>
                        </div>
                        {topic.estimatedTime && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{topic.estimatedTime}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 group-hover:border-white/40 transition-colors">
                      <svg
                        className="w-5 h-5 transition-transform group-hover:translate-x-1"
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
                </Link>
              )
            })}
          </div>
        </div>

        {/* Case Study Card */}
        {certification.caseStudy && (
          <div className="mt-12">
            <Link
              href={`/certifications/${slug}/case-study`}
              className="group block p-8 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 rounded-2xl hover:border-purple-500/40 hover:shadow-[0_8px_40px_rgba(168,85,247,0.15)] transition-all duration-300"
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-purple-300 group-hover:text-purple-200 transition-colors">
                      Hands-On Case Study
                    </h3>
                    <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs font-semibold text-purple-300 uppercase tracking-wider">
                      Guided Project
                    </span>
                  </div>
                  <h4 className="text-xl font-semibold text-white mb-3 group-hover:text-purple-100 transition-colors">
                    {certification.caseStudy.title}
                  </h4>
                  <p className="text-white/70 leading-relaxed mb-4">
                    {certification.caseStudy.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                    {certification.caseStudy.estimatedTime && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{certification.caseStudy.estimatedTime}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{certification.caseStudy.steps.length} guided steps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Real data included</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 self-center">
                  <svg
                    className="w-8 h-8 text-purple-400 group-hover:translate-x-2 transition-transform"
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
            </Link>
          </div>
        )}

        {/* Links */}
        {certification.officialUrl && (
          <div className="mt-12 text-center">
            <a
              href={certification.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#54b3d6] hover:text-blue-300 transition-colors"
            >
              View Official Exam Page
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
