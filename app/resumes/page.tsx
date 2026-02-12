import { Metadata } from 'next'
import Link from 'next/link'
import { getAllVariantMeta } from '@/lib/resume-data'

export const metadata: Metadata = {
  title: 'Resumes',
  description:
    'View and download role-specific resumes for Dillon Shearer: Data Engineer, Data Analyst, and Full-Stack Python Developer. PDF versions available.',
  openGraph: {
    title: 'Resumes',
    description:
      'View and download role-specific resumes for Dillon Shearer: Data Engineer, Data Analyst, and Full-Stack Python Developer. PDF versions available.',
    type: 'website',
  },
}

export default function ResumesPage() {
  const variants = getAllVariantMeta()

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="text-center mb-20">
          <div className="mb-6">
            <p className="section-label">
              Resumes
            </p>
          </div>
          <h1 className="section-title">
            Choose the Focus Area You're Hiring For
          </h1>
          <p className="section-subtitle max-w-2xl mx-auto">
            I maintain role-specific resumes tailored to different job families.
            Each highlights the same core experience through a different lens.
          </p>
        </header>

        {/* Variant Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {variants.map((variant) => (
            <div
              key={variant.slug}
              className="card-base card-hover flex flex-col p-6"
            >
              <div className="flex flex-col flex-1">
                {/* Title */}
                <h2 className="text-xl font-bold mb-3 text-white">
                  {variant.displayName}
                </h2>

                {/* Description */}
                <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {variant.shortDescription}
                </p>

                {/* Preview skills */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {variant.skillsSpotlight.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="badge-base badge-secondary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* View Resume button - pushed to bottom */}
                <Link
                  href={`/resumes/${variant.slug}`}
                  className="mt-auto btn-secondary w-full justify-center inline-flex items-center"
                >
                  View Resume
                  <svg
                    className="ml-2 w-3.5 h-3.5"
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
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="text-center text-sm mt-16 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          All resumes draw from the same experience.
          Each view emphasizes different aspects of my work.
        </p>
      </div>
    </div>
  )
}
