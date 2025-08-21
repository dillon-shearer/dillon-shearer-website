import { Metadata } from 'next'
import MaterialsDashboard from './dashboard'

export const metadata: Metadata = {
  title: 'Materials Dashboard Demo | DWD',
  description: 'Interactive materials inventory management dashboard with real-time analytics and scenario planning.',
  openGraph: {
    title: 'Materials Dashboard Demo | Data With Dillon',
    description: 'Interactive materials inventory management dashboard with real-time analytics and scenario planning.',
    type: 'website',
  },
}

export default function MaterialsDashboardPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Materials Dashboard Demo</h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Interactive inventory management system with real-time analytics, 
              scenario planning, and predictive insights for manufacturing operations.
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Component */}
      <MaterialsDashboard />

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