// app/demos/page.tsx
import { Metadata } from 'next'
import DemoGrid from '@/app/components/demo-grid'
import { getAllDemos } from '@/lib/demos'

export const metadata: Metadata = {
  title: 'Work Demos | Dillon Shearer',
  description: 'Interactive demonstrations by Dillon Shearer showcasing data engineering, analytics dashboards, AI implementation, and full-stack development skills.',
  openGraph: {
    title: 'Work Demos | Dillon Shearer',
    description: 'Interactive demonstrations by Dillon Shearer showcasing data engineering, analytics dashboards, AI implementation, and full-stack development skills.',
    type: 'website',
  },
}

export default function DemosPage() {
  const demos = getAllDemos()

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section - Using unified design system */}
        <div className="text-center mb-20">
          <div className="mb-6">
            <p className="section-label">Live Builds</p>
          </div>
          <h1 className="section-title">
            Work Demos
          </h1>
          <p className="section-subtitle max-w-2xl mx-auto">
            Interactive demonstrations showcasing my technical skills and problem-solving approach.
            Each demo is a fully functional application you can explore.
          </p>
        </div>

        {/* Demos Grid */}
        <DemoGrid demos={demos} />

        {/* Jupyter Notebooks CTA */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="card-base text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 text-white">
                  Jupyter Notebooks
                </h2>
                <p className="text-white/60 mb-5">
                  Explore my data science notebooks and analysis workflows
                </p>
              </div>
              <a
                href="/jupyter"
                className="inline-flex items-center px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl transition-all duration-200 hover:bg-purple-400 hover:translate-y-[-1px]"
              >
                View Notebooks
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="card-base text-center">
            <h2 className="text-2xl font-bold mb-3 text-white">
              Interested in working together?
            </h2>
            <p className="mb-5 text-white/60">
              I'm always excited to discuss new opportunities and challenging projects.
            </p>
            <a
              href="/contact"
              className="btn-primary inline-flex items-center"
            >
              Get in Touch
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
