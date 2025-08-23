import { Metadata } from 'next'
import PlatformSelector from './platform-selector'

export const metadata: Metadata = {
  title: 'Health Analytics Dashboards | DWD',
  description: 'Interactive health data visualization across 4 major BI platforms using CDC PLACES data.',
  openGraph: {
    title: 'Health Analytics Dashboards | Data With Dillon',
    description: 'Interactive health data visualization across 4 major BI platforms using CDC PLACES data.',
    type: 'website',
  },
}

export default function HealthDashboardsPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6">Multi-Platform Health Analytics</h1>
            <div className="max-w-4xl mx-auto">
              <p className="text-xl opacity-90 mb-8">
                Same CDC health data, four different business perspectives
              </p>
              
              {/* Business Questions Grid */}
              <div className="grid md:grid-cols-3 gap-6 text-left">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <h3 className="font-semibold text-blue-200 mb-2">"What are our key health outcomes?"</h3>
                  <p className="text-sm opacity-80">Executive dashboards with high-level KPIs and geographic insights</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <h3 className="font-semibold text-blue-200 mb-2">"How do demographics affect health?"</h3>
                  <p className="text-sm opacity-80">Deep analytical dive with interactive visualizations and correlations</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <h3 className="font-semibold text-blue-200 mb-2">"Where should we allocate resources?"</h3>
                  <p className="text-sm opacity-80">Operational dashboards for targeted interventions and planning</p>
                </div>
              </div>
              
              <p className="text-sm opacity-75 mt-6 italic">
                CDC PLACES Dataset • Live BI Platform Embeds • Same Data, Different Stories
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Selector */}
      <div className="py-12">
        <PlatformSelector />
      </div>

      {/* Dataset Info */}
      <div className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-6">About the Data</h2>
            <div className="max-w-3xl mx-auto">
              <p className="text-gray-300 mb-6">
                These dashboards use real CDC PLACES data - the nation's most comprehensive 
                source of local health information. The dataset includes health outcomes, 
                prevention measures, and risk behaviors for communities across the United States.
              </p>
              
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="font-semibold text-blue-400 mb-1">3,000+</div>
                  <div className="text-gray-400">Counties</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="font-semibold text-green-400 mb-1">29,000+</div>
                  <div className="text-gray-400">Cities & Places</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="font-semibold text-yellow-400 mb-1">27</div>
                  <div className="text-gray-400">Health Measures</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="font-semibold text-purple-400 mb-1">2024</div>
                  <div className="text-gray-400">Latest Data</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}