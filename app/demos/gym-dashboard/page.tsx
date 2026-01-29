// app/demos/gym-dashboard/page.tsx
import { Metadata } from 'next'
import GymDashboard from './dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gym Data Tracker | DWD',
  description: 'Daily updates of my personal gym lift data!',
  openGraph: {
    title: 'Gym Data Tracker | Data With Dillon',
    description:
      'Interactive materials inventory management dashboard with real-time analytics and scenario planning.',
    type: 'website',
  },
}

export default function GymDashboardPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Dashboard Component */}
      <GymDashboard />

      {/* Back to Demos Link (optional content area) */}
      <div className="bg-black border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center" />
        </div>
      </div>
    </div>
  )
}
