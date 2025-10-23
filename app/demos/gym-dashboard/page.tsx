import { Metadata } from 'next'
import GymDashboard from './dashboard'

export const metadata: Metadata = {
  title: 'Gym Data Tracker | DWD',
  description: 'Daily updates of my personal gym lift data!',
  openGraph: {
    title: 'Gym Data Tracker | Data With Dillon',
    description: 'Interactive materials inventory management dashboard with real-time analytics and scenario planning.',
    type: 'website',
  },
}

export default function GymDashboardPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6">Materials Dashboard Demo</h1>
            <div className="max-w-4xl mx-auto">
              <p className="text-xl opacity-90 mb-8">
                Transforming complex inventory questions into actionable insights
              </p>
              
              {/* Business Questions Grid */}
              <div className="grid md:grid-cols-3 gap-6 text-left">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <h3 className="font-semibold text-blue-200 mb-2">"What's our inventory health?"</h3>
                  <p className="text-sm opacity-80">Real-time KPIs, fill rates, and turnover ratios with industry benchmarks</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <h3 className="font-semibold text-blue-200 mb-2">"Which materials need attention?"</h3>
                  <p className="text-sm opacity-80">Automated status monitoring with critical, warning, and good indicators</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <h3 className="font-semibold text-blue-200 mb-2">"How do scenarios impact us?"</h3>
                  <p className="text-sm opacity-80">Interactive simulations for stockouts, seasonal spikes, and supply disruptions</p>
                </div>
              </div>
              
              <p className="text-sm opacity-75 mt-6 italic">
                Built with React + TypeScript • Live data manipulation • Comprehensive analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Component */}
      <GymDashboard />

      {/* Back to Demos Link */}
      <div className="bg-black border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
          </div>
        </div>
      </div>
    </div>
  )
}