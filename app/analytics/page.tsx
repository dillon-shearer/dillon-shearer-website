import { Metadata } from 'next'
import AnalyticsDashboard from './dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Analytics Dashboard',
  description: 'Website analytics and performance metrics',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AnalyticsPage() {
  return <AnalyticsDashboard />
}
