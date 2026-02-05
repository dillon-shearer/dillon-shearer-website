'use client'

type Props = {
  label: string
  value: number
  unit: string
  threshold: number
  description?: string
}

export default function PerformanceGauge({ label, value, unit, threshold, description }: Props) {
  const isGood = value > 0 && value <= threshold
  const percentage = Math.min((value / (threshold * 2)) * 100, 100)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#54b3d6]/30 transition-all">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-bold text-white/80">{label}</div>
        <div className="text-xs text-white/40">≤ {threshold}{unit}</div>
      </div>

      <div className={`text-3xl font-bold font-mono mb-3 ${isGood ? 'text-green-400' : 'text-yellow-400'}`}
           style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value > 0 ? value.toFixed(value < 10 ? 2 : 0) : '—'}
        {value > 0 && <span className="text-base ml-1 text-white/60">{unit}</span>}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${isGood ? 'bg-green-400' : 'bg-yellow-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && (
        <div className="text-xs text-white/40 mt-2">{description}</div>
      )}
    </div>
  )
}
