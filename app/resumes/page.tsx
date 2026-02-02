import { Metadata } from 'next'
import Link from 'next/link'
import { getAllVariantMeta } from '@/lib/resume-data'

export const metadata: Metadata = {
  title: 'Resumes | DWD',
  description:
    'Role-specific resumes tailored to different job families: Data Engineer, Data Analyst, and Full-Stack Python Developer.',
  openGraph: {
    title: 'Resumes | Data With Dillon',
    description:
      'Role-specific resumes tailored to different job families: Data Engineer, Data Analyst, and Full-Stack Python Developer.',
    type: 'website',
  },
}

export default function ResumesPage() {
  const allVariants = getAllVariantMeta()
  const comprehensive = allVariants.find((v) => v.slug === 'comprehensive')!
  const specialized = allVariants.filter((v) => v.slug !== 'comprehensive')

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
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

        <div className="max-w-5xl mx-auto">
          {/* Comprehensive Card - Full Width */}
          <div className="card-base card-hover p-8">
            {/* Title Row */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-3 text-white">
                  {comprehensive.displayName}
                </h2>
                <p className="text-white/60 leading-relaxed">
                  {comprehensive.shortDescription}
                </p>
              </div>
              <Link
                href={`/resumes/${comprehensive.slug}`}
                className="btn-secondary whitespace-nowrap inline-flex items-center"
              >
                View Resume
                <svg
                  className="ml-2 w-4 h-4"
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

          {/* Connector SVG */}
          <div className="hidden lg:flex justify-center py-4">
            <svg
              width="100%"
              height="48"
              viewBox="0 0 800 48"
              fill="none"
              className="max-w-3xl"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Vertical line from top */}
              <line
                x1="400"
                y1="0"
                x2="400"
                y2="24"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              {/* Horizontal line across */}
              <line
                x1="133"
                y1="24"
                x2="667"
                y2="24"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              {/* Three vertical lines down to cards */}
              <line
                x1="133"
                y1="24"
                x2="133"
                y2="48"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              <line
                x1="400"
                y1="24"
                x2="400"
                y2="48"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              <line
                x1="667"
                y1="24"
                x2="667"
                y2="48"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* Mobile connector - simple vertical line */}
          <div className="flex lg:hidden justify-center py-4">
            <div className="w-px h-8 bg-white/15" />
          </div>

          {/* Specialized Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {specialized.map((variant) => (
              <div
                key={variant.slug}
                className="card-base card-hover flex flex-col p-6"
              >
                <div className="flex flex-col flex-1">
                  {/* Specialized badge */}
                  <span className="text-label mb-3.5" style={{ color: 'var(--text-secondary)' }}>
                    Specialized
                  </span>

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
        </div>

        {/* Footnote */}
        <p className="text-center text-sm mt-16 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          All resumes draw from the same experience.
          Each specialized view emphasizes different aspects of my work.
        </p>
      </div>
    </div>
  )
}
