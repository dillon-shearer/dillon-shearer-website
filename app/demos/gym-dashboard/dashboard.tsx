'use client'

import { useState } from 'react'

interface LiftData {
  date: string
  exercise: string
  weight: number
  reps: number
  sets: number
}

const mockData: LiftData[] = [
  { date: '2025-10-20', exercise: 'Bench Press', weight: 185, reps: 8, sets: 4 },
  { date: '2025-10-20', exercise: 'Squat', weight: 225, reps: 6, sets: 4 },
  { date: '2025-10-18', exercise: 'Deadlift', weight: 275, reps: 5, sets: 3 },
  { date: '2025-10-18', exercise: 'Bench Press', weight: 180, reps: 10, sets: 4 },
  { date: '2025-10-15', exercise: 'Squat', weight: 215, reps: 8, sets: 4 },
]

export default function GymDashboard() {
  const [data] = useState<LiftData[]>(mockData)

  // Calculate some basic stats
  const totalWorkouts = new Set(data.map(d => d.date)).size
  const exercises = new Set(data.map(d => d.exercise)).size
  const totalVolume = data.reduce((sum, lift) => sum + (lift.weight * lift.reps * lift.sets), 0)

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="text-gray-400 text-sm mb-2">Total Workouts</div>
          <div className="text-3xl font-bold text-white">{totalWorkouts}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="text-gray-400 text-sm mb-2">Exercises Tracked</div>
          <div className="text-3xl font-bold text-white">{exercises}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="text-gray-400 text-sm mb-2">Total Volume (lbs)</div>
          <div className="text-3xl font-bold text-white">{totalVolume.toLocaleString()}</div>
        </div>
      </div>

      {/* Lift History Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Recent Lifts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Exercise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Weight (lbs)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Reps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Sets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Volume
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.map((lift, idx) => (
                <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {lift.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {lift.exercise}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {lift.weight}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {lift.reps}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {lift.sets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {(lift.weight * lift.reps * lift.sets).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}