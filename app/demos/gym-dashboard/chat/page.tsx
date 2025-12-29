import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function GymDashboardChatPage() {
  redirect('/demos/gym-dashboard')
}
