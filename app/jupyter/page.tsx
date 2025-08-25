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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Jupyter Notebooks
          </h1>
          <p className="text-xl max-w-3xl mx-auto">
            Interactive data science notebooks showcasing analysis, cleaning, and visualization techniques. 
            Explore the code, outputs, and methodologies behind my data projects.
          </p>
        </div>

        {/* Notebooks Grid */}
        <div className="flex flex-wrap justify-center gap-8 mb-16 max-w-[66rem] mx-auto">
          {notebooks.map((notebook) => (
            <NotebookCard key={notebook.slug} notebook={notebook} />
          ))}
        </div>

        {/* Call to Action */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">
              Interested in the full projects?
            </h2>
            <p className="mb-6">
              These notebooks are part of larger data science projects. Check out my complete demos 
              and applications for the full experience.
            </p>
            <a
              href="/demos"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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