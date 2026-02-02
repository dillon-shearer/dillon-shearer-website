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
    <div className="rounded-lg border border-white/20 shadow-2xl px-3 py-2 text-xs font-semibold bg-black/95 backdrop-blur-sm text-white/90 font-mono">
      {Number.isFinite(v) ? v.toLocaleString() : 0} lbs
    </div>
  )
}

export default function VolumeChart({ data, height = 256 }: Props) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 24, left: 40 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeOpacity={0.5} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }} stroke="rgba(255,255,255,0.1)" />
          <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }} stroke="rgba(255,255,255,0.1)" />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#54b3d6', strokeOpacity: 0.3 }} />
          <Area type="monotone" dataKey="volume" stroke="#54b3d6" fill="#54b3d6" strokeWidth={2.5} fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
