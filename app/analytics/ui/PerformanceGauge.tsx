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

  // Determine status color
  const statusColor = value === 0 ? 'text-white/30' : isGood ? 'text-emerald-400' : 'text-amber-400'
  const barColor = isGood ? 'bg-emerald-400/80' : 'bg-amber-400/80'
  const glowColor = isGood ? 'shadow-emerald-400/20' : 'shadow-amber-400/20'

  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#54b3d6]/20 transition-all">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-white/70">{label}</div>
        <div className="text-[10px] text-white/30 font-mono">
          ≤ {threshold}{unit}
        </div>
      </div>

      <div className={`text-2xl font-bold font-mono mb-3 transition-colors ${statusColor}`}
           style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value > 0 ? value.toFixed(value < 10 ? 2 : 0) : '—'}
        {value > 0 && <span className="text-sm ml-1.5 text-white/40 font-normal">{unit}</span>}
      </div>

      {/* Progress bar with gradient */}
      <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor} ${glowColor} shadow-lg`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && (
        <div className="text-[10px] text-white/30 mt-2.5 font-medium">{description}</div>
      )}
    </div>
  )
}
