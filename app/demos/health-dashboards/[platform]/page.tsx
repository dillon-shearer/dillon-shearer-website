import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// Platform configuration
const platforms = {
  'power-bi': {
    name: 'Power BI',
    description: 'Executive health outcomes dashboard with key performance indicators and regional comparisons',
    perspective: 'Executive Leadership',
    stakeholder: 'C-Suite, Board Members',
    color: 'from-purple-600 to-blue-600',
    accentColor: 'purple'
  },
  'tableau': {
    name: 'Tableau',
    description: 'Interactive analytical deep-dive into demographic correlations and health disparities',
    perspective: 'Data Analytics', 
    stakeholder: 'Analysts, Researchers',
    color: 'from-blue-600 to-cyan-600',
    accentColor: 'blue'
  },
  'looker': {
    name: 'Looker Studio',
    description: 'Operational dashboard for resource allocation and targeted intervention planning',
    perspective: 'Operations Management',
    stakeholder: 'Program Managers, Operations',
    color: 'from-green-600 to-teal-600',
    accentColor: 'green'
  },
  'quicksight': {
    name: 'QuickSight',
    description: 'Cost analysis and budget optimization for health programs and interventions',
    perspective: 'Financial Analysis',
    stakeholder: 'Finance, Budget Planners',
    color: 'from-orange-600 to-red-600',
    accentColor: 'orange'
  }
}

type PlatformKey = keyof typeof platforms

// Updated type for Next.js 15
type Params = {
  params: Promise<{
    platform: string
  }>
}

export async function generateStaticParams() {
  return Object.keys(platforms).map((platform) => ({
    platform: platform,
  }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { platform } = await params
  const platformData = platforms[platform as PlatformKey]
  
  if (!platformData) {
    return {
      title: 'Platform Not Found | DWD',
    }
  }

  return {
    title: `${platformData.name} Health Dashboard | DWD`,
    description: `${platformData.description} - CDC PLACES data visualization.`,
    openGraph: {
      title: `${platformData.name} Health Dashboard | Data With Dillon`,
      description: `${platformData.description} - CDC PLACES data visualization.`,
      type: 'website',
    },
  }
}

export default async function PlatformDashboardPage({ params }: Params) {
  const { platform } = await params
  const platformData = platforms[platform as PlatformKey]

  if (!platformData) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className={`bg-gradient-to-r ${platformData.color} text-white`}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            {/* Back Navigation */}
            <div className="flex justify-start mb-6">
              <Link
                href="/demos/health-dashboards"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Platform Selector
              </Link>
            </div>

            <div className="mb-6">
              <div className="inline-flex items-center gap-3 mb-4">
                <span className={`px-3 py-1.5 text-xs font-semibold rounded-full bg-white/20 text-white`}>
                  {platformData.perspective}
                </span>
                <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                  ⏳ Coming Soon
                </span>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">
                {platformData.name} Health Dashboard
              </h1>
              
              <p className="text-xl opacity-90 mb-6 max-w-3xl mx-auto">
                {platformData.description}
              </p>

              <div className="inline-flex items-center gap-2 text-white/80">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Target Audience: {platformData.stakeholder}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {/* Status Card */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 mb-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">Dashboard In Development</h2>
              <p className="text-gray-400 text-lg mb-6">
                This {platformData.name} dashboard is currently being built using CDC PLACES health data.
                Check back soon to explore interactive health analytics designed for {platformData.stakeholder.toLowerCase()}.
              </p>
            </div>

            {/* What's Coming */}
            <div className="text-left max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-white mb-4">What's Coming:</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    platformData.accentColor === 'purple' ? 'bg-purple-400' :
                    platformData.accentColor === 'blue' ? 'bg-blue-400' :
                    platformData.accentColor === 'green' ? 'bg-green-400' :
                    'bg-orange-400'
                  }`}></div>
                  <span>Interactive health outcome visualizations</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    platformData.accentColor === 'purple' ? 'bg-purple-400' :
                    platformData.accentColor === 'blue' ? 'bg-blue-400' :
                    platformData.accentColor === 'green' ? 'bg-green-400' :
                    'bg-orange-400'
                  }`}></div>
                  <span>Real CDC PLACES data integration</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    platformData.accentColor === 'purple' ? 'bg-purple-400' :
                    platformData.accentColor === 'blue' ? 'bg-blue-400' :
                    platformData.accentColor === 'green' ? 'bg-green-400' :
                    'bg-orange-400'
                  }`}></div>
                  <span>Geographic filtering and comparisons</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    platformData.accentColor === 'purple' ? 'bg-purple-400' :
                    platformData.accentColor === 'blue' ? 'bg-blue-400' :
                    platformData.accentColor === 'green' ? 'bg-green-400' :
                    'bg-orange-400'
                  }`}></div>
                  <span>Responsive, mobile-optimized design</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dataset Info */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">About the Data</h3>
            <p className="text-blue-300 text-sm leading-relaxed">
              All dashboards in this project use the same CDC PLACES dataset - the nation's most 
              comprehensive local health data. Each platform presents this data through a different 
              business lens, demonstrating how the same dataset can serve multiple stakeholder needs 
              and answer different strategic questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}