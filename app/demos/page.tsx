// app/demos/page.tsx
import { Metadata } from 'next'
import DemoCard from '@/app/components/demo-card'
import { getAllDemos } from '@/lib/demos'

export const metadata: Metadata = {
  title: 'Work Demos | DWD',
  description: 'Interactive demonstrations of my development work and technical skills.',
  openGraph: {
    title: 'Work Demos | Data With Dillon',
    description: 'Interactive demonstrations of my development work and technical skills.',
    type: 'website',
  },
}

export default function DemosPage() {
  const demos = getAllDemos()

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">
            Work Demos
          </h1>
          <p className="text-xl max-w-3xl mx-auto">
            Interactive demonstrations showcasing my technical skills and problem-solving approach. 
            Each demo is a fully functional application you can explore.
          </p>
        </div>

        {/* Demos Grid */}
        <div className="flex flex-wrap justify-center gap-10 [&>*]:w-full [&>*]:max-w-2xl lg:[&>*]:w-[calc(50%-1.25rem)] lg:[&>*]:max-w-none">
          {demos.map((demo) => (
            <DemoCard key={demo.slug} demo={demo} />
          ))}
        </div>

        {/* Call to Action - Now constrained to max-w-4xl to match content width */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mt-16 p-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">
              Interested in working together?
            </h2>
            <p className="mb-6">
              I'm always excited to discuss new opportunities and challenging projects.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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