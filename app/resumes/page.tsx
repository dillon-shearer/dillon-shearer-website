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
  const variants = getAllVariantMeta()

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-[#54b3d6] mb-4">
            Resumes
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Choose the focus area you're hiring for
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            I maintain role-specific resumes tailored to different job families.
            Each highlights the same core experience through a different lens.
          </p>
        </header>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {variants.map((variant) => (
            <div
              key={variant.slug}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-8 transition-all duration-300 hover:border-white/20 hover:shadow-[0_8px_40px_rgba(84,179,214,0.08)] flex flex-col"
            >
              <div className="relative z-10 flex flex-col flex-1">
                {/* Title */}
                <h2 className="text-2xl font-semibold text-white mb-2">
                  {variant.displayName}
                </h2>

                {/* Description */}
                <p className="text-white/60 mb-6">
                  {variant.shortDescription}
                </p>

                {/* Preview skills */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {variant.skillsSpotlight.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/5 transition-colors duration-200 group-hover:text-white/70"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* View Resume button - pushed to bottom */}
                <Link
                  href={`/resumes/${variant.slug}`}
                  className="mt-auto inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-colors w-full border border-white/30 hover:border-white text-white"
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
          ))}
        </div>

        {/* Footnote */}
        <p className="text-center text-white/40 text-sm mt-12 max-w-2xl mx-auto">
          All three resumes draw from the same experience. No fabrication, only reframing.
          Each emphasizes different aspects of my work across the data lifecycle.
        </p>
      </div>
    </div>
  )
}
