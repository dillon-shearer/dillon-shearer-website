// app/demos/gym-dashboard/dashboard.tsx
import { getGymLifts, type GymLift } from './form/actions'
import DashboardClient from './ui/DashboardClient'

// Server component wrapper that your page imports
export default async function GymDashboard() {
  const lifts: GymLift[] = await getGymLifts()
  return <DashboardClient lifts={lifts} />
}