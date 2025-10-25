// app/demos/gym-dashboard/ui/VolumeChart.tsx
'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Props = {
  data: { date: string; volume: number }[]
  height?: number // px; default 256
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const v = Number(payload[0]?.value ?? 0)
  return (
    <div className="rounded-md border shadow-lg px-3 py-2 text-xs bg-[#1f2937] border-[#374151] text-white">
      Volume: {Number.isFinite(v) ? v.toLocaleString() : 0} lbs
    </div>
  )
}

export default function VolumeChart({ data, height = 256 }: Props) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 24, left: 40 }}>
          <CartesianGrid stroke="#374151" strokeOpacity={0.6} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} stroke="#9ca3af" />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#9ca3af', strokeOpacity: 0.25 }} />
          <Area type="monotone" dataKey="volume" strokeWidth={2} fillOpacity={0.25} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
