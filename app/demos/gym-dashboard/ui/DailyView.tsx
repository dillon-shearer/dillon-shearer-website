// app/demos/gym-dashboard/ui/DailyView.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { GymLift } from '../form/actions'
import { getBodyPartsForDate } from '../form/actions'
import {
  ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis
} from 'recharts'

type Props = {
  lifts: GymLift[]
  date: string
  onChangeDate?: (newDate: string) => void
}

type BodyPart =
  | 'biceps' | 'chest' | 'shoulders' | 'back' | 'triceps'
  | 'quads' | 'hamstrings' | 'forearms' | 'core'
  | 'glutes' | 'calves' | 'hips'

const COLORS_BP: Record<BodyPart | 'other', string> = {
  biceps:'#f59e0b', chest:'#f87171', shoulders:'#60a5fa', back:'#22d3ee',
  triceps:'#fb7185', quads:'#34d399', hamstrings:'#84cc16', forearms:'#fbbf24',
  core:'#a78bfa', glutes:'#f472b6', calves:'#10b981', hips:'#38bdf8', other:'#9ca3af'
}

const toTitle = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())

/* ================= UTC helpers ================= */
const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(n => parseInt(n, 10))
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}
const fmtShortMD = (d: Date) =>
  d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'numeric', day: 'numeric' })
const fmtWeekdayShort = (d: Date) =>
  d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' })
const ymd = (d: Date) => d.toISOString().slice(0, 10)

/* ================= Exercise → BodyPart mapping =================
   Keep this in lockstep with the catalog in app/demos/gym-dashboard/form/page.tsx */
const EXERCISES_BY_BODY_PART: Record<BodyPart, string[]> = {
  biceps:     ['Preacher Curl', 'Hammer Curl', 'Bayesian Curl', 'Incline Curl'],
  chest:      ['Incline Press', 'Flat Press', 'Decline Press', 'Chest Fly', 'Bench Press'],
  shoulders:  ['Lateral Raise', 'Overhead Press', 'Rear Delt Fly', 'Rear Delt Xs'],
  back:       ['Lat Pulldown', 'High Row', 'Low Row', 'Pull Ups', 'Pull Overs'],
  triceps:    ['Tricep Pushdowns', 'Tricep Extensions', 'Skull Crushers', 'Tricep Kickbacks', 'Dips'],
  quads:      ['Leg Press', 'Hack Squat', 'Pendelum Squat', 'Squat', 'Leg Extensions', 'Split Squat'],
  hamstrings: ['RDLs', 'Seated Leg Curl', 'Lying Leg Curl', 'Hamstrick Kickback'],
  forearms:   ['Wrist Curl','Reverse Curl', 'Reverse Wrist Curl'],
  core:       ['Hanging Leg Raise','Decline Crunch','Flat Crunch', 'Incline Crunch', 'Oblique Twist'],
  glutes:     ['Hip Thrust', 'Glute Kickback'],
  calves:     ['Standing Calf Raise','Seated Calf Raise'],
  hips:       ['Abduction Machine','Adduction Machine'],
}

const normalize = (s: string) =>
  s.toLowerCase()
   .replace(/[^a-z0-9\s]/g, '')
   .replace(/\s+/g, ' ')
   .trim()
   .replace(/s\b/, '')

const EX_TO_BP = (() => {
  const m = new Map<string, BodyPart>()
  ;(Object.keys(EXERCISES_BY_BODY_PART) as BodyPart[]).forEach((bp) => {
    EXERCISES_BY_BODY_PART[bp].forEach((ex) => m.set(normalize(ex), bp))
  })
  // alternates
  m.set(normalize('RDL'), 'hamstrings')
  m.set(normalize('Hip Thrusts'), 'glutes')
  m.set(normalize('Pull Up'), 'back')
  m.set(normalize('Pull Over'), 'back')
  return m
})()

const bodyPartForExercise = (ex: string): BodyPart | 'other' =>
  EX_TO_BP.get(normalize(ex)) ?? 'other'

/* ================= Component ================= */
export default function DailyView({ lifts, date, onChangeDate }: Props) {
  const dayLifts = useMemo(() => lifts.filter(l => l.date === date), [lifts, date])

  // keep loading explicit tags (used elsewhere), but donut is data-driven
  const [selectedBodyParts, setSelectedBodyParts] = useState<BodyPart[]>([])
  useEffect(() => {
    let mounted = true
    getBodyPartsForDate(date)
      .then((parts) => {
        if (!mounted) return
        const clean = (Array.isArray(parts) ? parts : []).filter(Boolean) as BodyPart[]
        setSelectedBodyParts(clean)
      })
      .catch(() => setSelectedBodyParts([]))
    return () => { mounted = false }
  }, [date])

  /* ================= KPIs ================= */
  const totalVolume = useMemo(() => dayLifts.reduce((s, l) => s + l.weight * l.reps, 0), [dayLifts])
  const totalSets = dayLifts.length
  const totalReps = useMemo(() => dayLifts.reduce((s, l) => s + l.reps, 0), [dayLifts])
  const exerciseCount = useMemo(() => new Set(dayLifts.map(l => l.exercise)).size, [dayLifts])

  /* ================= Donut data ================= */
  const byBodyPart = useMemo(() => {
    const vols = new Map<BodyPart, number>()
    const sets = new Map<BodyPart, number>()
    for (const l of dayLifts) {
      const bp = bodyPartForExercise(l.exercise)
      if (bp === 'other') continue
      vols.set(bp, (vols.get(bp) || 0) + l.weight * l.reps)
      sets.set(bp, (sets.get(bp) || 0) + 1)
    }
    return Array.from(vols.entries())
      .map(([bp, volume]) => ({
        bp,
        name: toTitle(bp),
        volume,
        sets: sets.get(bp) || 0,
        color: COLORS_BP[bp],
      }))
      .sort((a, b) => b.volume - a.volume)
  }, [dayLifts])

  const topBodyPart = byBodyPart[0]?.name ?? '—'

  /* ================= Last 7 days strip (RIGHT = today) =================
     - Always renders the past 6 days + today (UTC), rightmost is today.
     - Buttons are ALWAYS clickable (even with no data) so you can navigate back/forward.
     - No navigation beyond today because we do not render future slots. */
  const last7 = useMemo(() => {
    const now = new Date()
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const days: { ymd: string; label: string; hasData: boolean; isToday: boolean }[] = []
    // map of volume presence by date for quick lookup
    const volMap = new Map<string, number>()
    for (const l of lifts) volMap.set(l.date, (volMap.get(l.date) || 0) + l.weight * l.reps)

    // produce oldest→newest so the far right is today
    for (let offset = -6; offset <= 0; offset++) {
      const d = new Date(todayUTC)
      d.setUTCDate(todayUTC.getUTCDate() + offset)
      const k = ymd(d)
      const label = `${fmtWeekdayShort(d)} | ${fmtShortMD(d)}`
      days.push({
        ymd: k,
        label,
        hasData: (volMap.get(k) ?? 0) > 0,
        isToday: offset === 0,
      })
    }
    return days
  }, [lifts])

  /* ================= Cumulative series ================= */
  type Point = { idx: number; cumVol: number; bp: BodyPart | 'other'; ex: string }
  const cumSeries: Point[] = useMemo(() => {
    let cum = 0
    const seq = [...dayLifts].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0
      const tb = new Date(b.timestamp).getTime() || 0
      if (ta !== tb) return ta - tb
      if (a.exercise !== b.exercise) return a.exercise.localeCompare(b.exercise)
      return a.setNumber - b.setNumber
    })
    return seq.map((l, i) => {
      cum += l.weight * l.reps
      const bp = bodyPartForExercise(l.exercise)
      return { idx: i + 1, cumVol: cum, bp, ex: l.exercise }
    })
  }, [dayLifts])

  const bpStops = useMemo(() => {
    const out: { key: string; offset: number; color: string }[] = []
    if (cumSeries.length === 0) return out
    const n = cumSeries.length
    let prevBP = cumSeries[0].bp
    out.push({ key: `start-0`, offset: 0, color: COLORS_BP[prevBP] || COLORS_BP.other })
    for (let i = 1; i < n; i++) {
      const cur = cumSeries[i].bp
      if (cur !== prevBP) {
        const off = (i / (n - 1)) * 100
        out.push({ key: `bp-${i}-a`, offset: off, color: COLORS_BP[prevBP] || COLORS_BP.other })
        out.push({ key: `bp-${i}-b`, offset: off, color: COLORS_BP[cur] || COLORS_BP.other })
        prevBP = cur
      }
    }
    out.push({ key: `end-${n}`, offset: 100, color: COLORS_BP[prevBP] || COLORS_BP.other })
    return out
  }, [cumSeries])

  const legendBPs = useMemo(() => {
    const set = new Set<BodyPart | 'other'>()
    for (const p of cumSeries) set.add(p.bp)
    return Array.from(set).filter(bp => bp !== 'other') as BodyPart[]
  }, [cumSeries])

  return (
    <div className="space-y-6">
      {/* Last 7 days (Sun→Sat replaced with rolling 7 ending today) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="mb-3 text-center">
          <h2 className="text-lg font-semibold text-white">Last 7 days</h2>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {last7.map((d) => {
            const isSelected = d.ymd === date
            const base = [
              'flex flex-col items-center rounded border py-2 px-2 transition-colors',
              isSelected
                ? 'bg-green-500/70 border-green-400 text-white'
                : (d.hasData
                    ? 'bg-transparent border-gray-700 text-gray-200 hover:bg-gray-800/40'
                    : 'bg-transparent border-gray-800 text-gray-500 hover:bg-gray-800/30 opacity-80')
            ].join(' ')
            return (
              <button
                key={d.ymd}
                onClick={() => onChangeDate?.(d.ymd)}
                className={base}
                title={d.label + (d.isToday ? ' (Today)' : '')}
                aria-label={d.label + (d.isToday ? ' (Today)' : '')}
              >
                <div className="text-[11px]">
                  {d.isToday ? 'Today' : d.label}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="text-sm text-gray-400">Total Volume</div>
          <div className="text-2xl font-semibold mt-2">{totalVolume.toLocaleString()} lbs</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="text-sm text-gray-400">Exercises • Sets • Reps</div>
          <div className="text-2xl font-semibold mt-2">
            {exerciseCount} • {totalSets} • {totalReps}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="text-sm text-gray-400">Top Body Part</div>
          <div className="text-2xl font-semibold mt-2">{topBodyPart}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
          <div className="text-sm text-gray-400">Near-Max Sets</div>
          <div className="text-2xl font-semibold mt-2">
            {
              dayLifts.filter(l => {
                const best = lifts
                  .filter(x => x.exercise === l.exercise)
                  .reduce((m, x) => Math.max(m, Math.round(x.weight * (1 + x.reps / 30))), 0)
                const cur = Math.round(l.weight * (1 + l.reps / 30))
                return best && cur / best >= 0.9
              }).length
            }
          </div>
          <div className="text-[11px] text-gray-500 mt-1">≥ 90% of lifetime 1RM</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative Volume */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Cumulative Volume (by body part)</h2>
            <div className="hidden md:flex flex-wrap gap-3">
              {legendBPs.map((bp) => (
                <div key={bp} className="flex items-center gap-1 text-xs text-gray-300">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: COLORS_BP[bp] }}
                    aria-hidden
                  />
                  <span>{toTitle(bp)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumSeries} margin={{ top: 10, right: 16, bottom: 24, left: 40 }}>
                <defs>
                  <linearGradient id="bpStroke" x1="0" y1="0" x2="1" y2="0">
                    {bpStops.map(s => (
                      <stop key={s.key} offset={`${s.offset}%`} stopColor={s.color} />
                    ))}
                  </linearGradient>
                  <linearGradient id="bpFill" x1="0" y1="0" x2="1" y2="0">
                    {bpStops.map(s => (
                      <stop key={`${s.key}-f`} offset={`${s.offset}%`} stopColor={s.color} stopOpacity={0.15} />
                    ))}
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#374151" strokeOpacity={0.6} />
                <XAxis dataKey="idx" tick={{ fontSize: 12, fill: '#9ca3af' }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} stroke="#9ca3af" />
                <RTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p: any = payload[0]?.payload
                    const bp = (p.bp ?? 'other') as BodyPart | 'other'
                    const ex = String(p.ex || '')
                    return (
                      <div className="rounded-md border shadow-lg px-3 py-2 text-xs bg-[#1f2937] border-[#374151] text-white">
                        Exercise: {ex}<br/>
                        Body Part: {toTitle(String(bp))}<br/>
                        Cumulative: {Number(p.cumVol).toLocaleString()} lbs
                      </div>
                    )
                  }}
                  cursor={{ stroke: '#9ca3af', strokeOpacity: 0.25 }}
                />

                <Area
                  type="monotone"
                  dataKey="cumVol"
                  stroke="url(#bpStroke)"
                  strokeWidth={2}
                  fill="url(#bpFill)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    const bp = (payload.bp ?? 'other') as BodyPart | 'other'
                    const color = COLORS_BP[bp] || COLORS_BP.other
                    return <circle cx={cx} cy={cy} r={3} fill={color} stroke={color} />
                  }}
                  activeDot={(props: any) => {
                    const { cx, cy, payload } = props
                    const bp = (payload.bp ?? 'other') as BodyPart | 'other'
                    const color = COLORS_BP[bp] || COLORS_BP.other
                    return <circle cx={cx} cy={cy} r={5} fill={color} stroke={color} />
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Mobile legend */}
          <div className="mt-3 flex md:hidden flex-wrap gap-3">
            {legendBPs.map((bp) => (
              <div key={bp} className="flex items-center gap-1 text-xs text-gray-300">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: COLORS_BP[bp] }} />
                <span>{toTitle(bp)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut: Volume by Body Part */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold">Volume by Body Part</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byBodyPart}
                  dataKey="volume"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {byBodyPart.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  formatter={(value: any) => toTitle(String(value))}
                />
                <RTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p: any = payload[0]
                    const datum = p?.payload || {}
                    const v = Number(p.value || 0)
                    const total = byBodyPart.reduce((s, d) => s + d.volume, 0) || 1
                    const pct = Math.round((v / total) * 100)
                    return (
                      <div className="rounded-md border shadow-lg px-3 py-2 text-xs bg-[#1f2937] border-[#374151] text-white">
                        {p.name}: {v.toLocaleString()} lbs • {pct}%<br/>
                        Sets: {datum.sets ?? 0}
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Exercise Flow */}
      <ExerciseFlow lifts={dayLifts} />
    </div>
  )
}

/* ============== small, local component for the flow chips ============== */
function ExerciseFlow({ lifts }: { lifts: GymLift[] }) {
  const COLORS_BP = {
    biceps:'#f59e0b', chest:'#f87171', shoulders:'#60a5fa', back:'#22d3ee',
    triceps:'#fb7185', quads:'#34d399', hamstrings:'#84cc16', forearms:'#fbbf24',
    core:'#a78bfa', glutes:'#f472b6', calves:'#10b981', hips:'#38bdf8', other:'#9ca3af'
  } as const

  const flowGroups = useMemo(() => {
    const seq = [...lifts].sort((a,b)=>{
      const ta=new Date(a.timestamp).getTime()||0
      const tb=new Date(b.timestamp).getTime()||0
      if(ta!==tb) return ta-tb
      if(a.exercise!==b.exercise) return a.exercise.localeCompare(b.exercise)
      return a.setNumber-b.setNumber
    })
    const out: { exercise: string; sets: number }[] = []
    for (let i=0;i<seq.length;i++){
      const ex=seq[i].exercise
      let j=i, sets=0
      while(j<seq.length && seq[j].exercise===ex){ sets++; j++ }
      out.push({ exercise: ex, sets })
      i=j-1
    }
    return out
  }, [lifts])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold mb-3">Exercise Flow</h2>
      <div className="flex flex-wrap gap-3">
        {flowGroups.map((g, i) => {
          const bp = bodyPartForExercise(g.exercise)
          const color = (COLORS_BP as any)[bp] || (COLORS_BP as any).other
          return (
            <div
              key={`${g.exercise}-${i}`}
              className="inline-flex items-center rounded-md border border-gray-700 bg-gray-800/60 px-3 py-2"
              title={`${g.exercise} • ${g.sets} set${g.sets>1?'s':''}`}
            >
              <span className="mr-2 inline-flex items-center justify-center rounded-full text-[11px] font-semibold bg-gray-700 text-white w-5 h-5">
                {i + 1}
              </span>
              <span className="font-medium text-sm whitespace-nowrap">{g.exercise}</span>
              <span className="inline-block w-3" />
              <div className="flex gap-1">
                {Array.from({ length: g.sets }).map((_, idx) => (
                  <span key={idx} className="inline-block w-2 h-2 rounded" style={{ background: color }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
