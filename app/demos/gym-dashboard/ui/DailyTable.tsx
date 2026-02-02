// app/demos/gym-dashboard/ui/DailyTable.tsx
'use client'

import type { GymLift } from '../form/actions'

export default function DailyTable({ lifts }: { lifts: GymLift[] }) {
  const rows = [...lifts].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1 // newest first
    if (a.exercise !== b.exercise) return a.exercise.localeCompare(b.exercise)
    return a.setNumber - b.setNumber
  })

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-white/40 border-b border-white/5">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Exercise</th>
            <th className="py-2 pr-4">Set</th>
            <th className="py-2 pr-4">Weight (lbs)</th>
            <th className="py-2 pr-4">Reps</th>
            <th className="py-2 pr-4">Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-white/5">
              <td className="py-2 pr-4">{r.date}</td>
              <td className="py-2 pr-4">{r.exercise}</td>
              <td className="py-2 pr-4">{r.setNumber}</td>
              <td className="py-2 pr-4">{r.weight}</td>
              <td className="py-2 pr-4">{r.reps}</td>
              <td className="py-2 pr-4">{(r.weight * r.reps).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
