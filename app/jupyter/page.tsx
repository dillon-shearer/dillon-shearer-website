// app/jupyter/page.tsx
import { Metadata } from 'next'
import NotebookCard from '@/app/components/notebook-card'
import { getAllNotebooks } from '@/lib/notebooks'

export const metadata: Metadata = {
  title: 'Jupyter Notebooks | DWD',
  description: 'Interactive data science notebooks showcasing analysis, cleaning, and visualization techniques.',
  openGraph: {
    title: 'Jupyter Notebooks | Data With Dillon',
    description: 'Interactive data science notebooks showcasing analysis, cleaning, and visualization techniques.',
    type: 'website',
  },
}

export default function JupyterPage() {
  const notebooks = getAllNotebooks()

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="mb-6">
            <p className="section-label">Data Science</p>
          </div>
          <h1 className="section-title">
            Jupyter Notebooks
          </h1>
          <p className="section-subtitle max-w-2xl mx-auto">
            Interactive data science notebooks showcasing analysis, cleaning, and visualization techniques.
            Explore the code, outputs, and methodologies behind my data projects.
          </p>
        </div>

        {/* Notebooks Grid */}
        <div className="flex flex-wrap justify-center gap-8 mb-20 max-w-[66rem] mx-auto">
          {notebooks.map((notebook) => (
            <NotebookCard key={notebook.slug} notebook={notebook} />
          ))}
        </div>

        {/* Call to Action */}
        <div className="max-w-2xl mx-auto">
          <div className="card-base text-center p-12">
            <h2 className="text-2xl font-bold mb-5 text-white">
              Interested in the Full Projects?
            </h2>
            <p className="mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              These notebooks are part of larger data science projects. Check out my complete demos
              and applications for the full experience.
            </p>
            <a
              href="/demos"
              className="btn-primary inline-flex items-center"
            >
              View Full Demos
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