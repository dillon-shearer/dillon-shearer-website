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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-[#54b3d6] mb-4">
            Resumes
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Choose the focus area you&apos;re hiring for
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            I maintain role-specific resumes tailored to different job families.
            Each highlights the same core experience through a different lens.
          </p>
        </header>

        <div className="max-w-5xl mx-auto">
          {/* Comprehensive Card - Full Width */}
          <div className="group relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/[0.08] to-transparent p-8 transition-all duration-300 hover:border-white/30 hover:shadow-[0_8px_40px_rgba(255,255,255,0.06)]">
            <div className="relative z-10">
              {/* Title Row */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {comprehensive.displayName}
                  </h2>
                  <p className="text-white/60">
                    {comprehensive.shortDescription}
                  </p>
                </div>
                <Link
                  href={`/resumes/${comprehensive.slug}`}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-colors border border-white/30 hover:border-white text-white whitespace-nowrap"
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {specialized.map((variant) => (
              <div
                key={variant.slug}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-5 transition-all duration-300 hover:border-white/20 hover:shadow-[0_8px_40px_rgba(84,179,214,0.08)] flex flex-col"
              >
                <div className="relative z-10 flex flex-col flex-1">
                  {/* Specialized badge */}
                  <span className="text-[9px] uppercase tracking-widest text-white/30 mb-2">
                    Specialized
                  </span>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-white mb-1">
                    {variant.displayName}
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-white/60 mb-4">
                    {variant.shortDescription}
                  </p>

                  {/* Preview skills */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {variant.skillsSpotlight.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 text-[11px] bg-white/5 text-white/50 rounded-full border border-white/5 transition-colors duration-200 group-hover:text-white/70"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* View Resume button - pushed to bottom */}
                  <Link
                    href={`/resumes/${variant.slug}`}
                    className="mt-auto inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-colors w-full border border-white/30 hover:border-white text-white"
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
        <p className="text-center text-white/40 text-sm mt-12 max-w-2xl mx-auto">
          All resumes draw from the same experience.
          Each specialized view emphasizes different aspects of my work.
        </p>
      </div>
    </div>
  )
}
