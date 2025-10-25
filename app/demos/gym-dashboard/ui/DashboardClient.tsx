// app/demos/gym-dashboard/ui/DashboardClient.tsx
'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import type { GymLift } from '../form/actions'
import VolumeChart from './VolumeChart'
import Heatmap from './Heatmap'
import DailyView from './DailyView'
import UtilityCard from './UtilityCard'
import BodyDiagram, { BodyPart } from './BodyDiagram'

type RangeMode = 'day' | 'month' | 'week' | 'year'
type SortKey = 'exercise' | 'bestWeight' | 'best1RM' | 'bestSetDate'

/* -------------------------- tiny helpers -------------------------- */
const formatNum = (n: number) => n.toLocaleString()
const unique = <T,>(arr: T[]) => Array.from(new Set(arr))

// UTC date helpers
const toKeyDate = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d))
const addUTCDays = (d: Date, n: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n))

const todayUTCKey = () => toKeyDate(new Date())
const clampToToday = (ymd: string) => (ymd > todayUTCKey() ? todayUTCKey() : ymd)
const shiftYMD = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10))
  return toKeyDate(addUTCDays(new Date(Date.UTC(y, m - 1, d)), days))
}

function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]
    const k = key(item)
    const bucket = m.get(k)
    if (bucket) bucket.push(item)
    else m.set(k, [item])
  }
  return m
}

function lastNDatesUTC(n: number, until: Date) {
  const end = utc(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate())
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(toKeyDate(addUTCDays(end, -i)))
  return out
}
function yearDatesYTDUTC(year: number) {
  const today = new Date()
  const end = utc(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const start = utc(year, 0, 1)
  const last = year === today.getUTCFullYear() ? end : utc(year, 11, 31)
  const out: string[] = []
  for (let d = start; d <= last; d = addUTCDays(d, 1)) out.push(toKeyDate(d))
  return out
}
function calcDailyVolume(lifts: GymLift[], dates: string[]) {
  const byDate = groupBy(lifts, (l: GymLift) => l.date)
  return dates.map(date => {
    const day = byDate.get(date) ?? []
    const volume = day.reduce((sum: number, l: GymLift) => sum + l.weight * l.reps, 0)
    return { date, volume, lifts: day }
  })
}

/* -------------------------- Tooltip -------------------------- */
function Tooltip({
  text, children, offset = 12,
}: { text: string; children: React.ReactNode; offset?: number }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <>
      <span
        ref={ref}
        className="inline-flex items-center"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </span>
      {visible && (
        <div className="fixed z-50 pointer-events-none" style={{ left: pos.x + offset, top: pos.y + offset }}>
          <div className="rounded-md border shadow-lg px-3 py-2 text-xs bg-[#1f2937] border-[#374151] text-white">
            {text}
          </div>
        </div>
      )}
    </>
  )
}

/* -------------------------- format helpers -------------------------- */
function formatYMDHM_EST(d?: Date | null) {
  if (!d) return ''
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
  const parts = formatter.formatToParts(d)
  const lookup: Record<string, string> = Object.fromEntries(parts.map(p => [p.type, p.value]))
  const ampm = (lookup as any).dayPeriod ? (lookup as any).dayPeriod.toLowerCase() : ''
  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}${ampm} EST`
}
function formatLongDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function titleCaseTag(tag?: string | null) {
  if (!tag) return ''
  return tag.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
}
function cleanTag(s?: string | null) {
  return (s ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/* -------------------------- Exercise → BodyPart map -------------------------- */
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
const EXERCISE_TO_BODY: Record<string, BodyPart> = Object.entries(EXERCISES_BY_BODY_PART)
  .reduce((acc, [bp, arr]) => { for (const ex of arr) acc[ex] = bp as BodyPart; return acc }, {} as Record<string, BodyPart>)

const EXERCISE_TO_BODY_LOWER: Record<string, BodyPart> = Object.fromEntries(
  Object.entries(EXERCISE_TO_BODY).map(([k, v]) => [k.toLowerCase(), v])
)

/** NEW: fuzzy fallback recognizer so sets don’t all zero out */
function getBodyPartForExercise(rawName: string): BodyPart | undefined {
  const name = (rawName || '').trim()
  if (!name) return undefined
  const lower = name.toLowerCase()

  // exact / lower maps first
  if (EXERCISE_TO_BODY[name]) return EXERCISE_TO_BODY[name]
  if (EXERCISE_TO_BODY_LOWER[lower]) return EXERCISE_TO_BODY_LOWER[lower]

  // forearms first (to avoid matching generic "curl")
  if (/wrist/.test(lower)) return 'forearms'

  // chest
  if (/\bbench\b|chest|fly\b/.test(lower)) return 'chest'

  // shoulders
  if (/\bohp\b|overhead press|shoulder|lateral raise|rear delt|delt/.test(lower)) return 'shoulders'

  // triceps
  if (/tricep|skull ?crush|pushdown|extension\b/.test(lower)) return 'triceps'

  // biceps
  if (/\bbicep|curl/.test(lower)) return 'biceps'

  // back (make sure "lat" is tied to back movements, not "lateral")
  if (/lat(?!eral)|pulldown|pull[- ]?down|row\b|pull[- ]?up|pullup|pullover/.test(lower)) return 'back'

  // quads
  if (/squat\b(?!.*(split|bulgarian))|hack|pendulum|leg press|leg extension/.test(lower)) return 'quads'

  // hamstrings
  if (/rdl|romanian|leg curl|hamstring|good ?morning/.test(lower)) return 'hamstrings'

  // glutes
  if (/hip thrust|glute/.test(lower)) return 'glutes'

  // calves
  if (/calf/.test(lower)) return 'calves'

  // core
  if (/crunch|leg raise|plank|sit[- ]?up|ab(?!duction)/.test(lower)) return 'core'

  // hips
  if (/abduction|adduction/.test(lower)) return 'hips'

  return undefined
}

/* -------------------------- Small UI atoms -------------------------- */
function StatChip({ label, value, sub, className }: {
  label: string; value: number | string; sub?: string; className?: string
}) {
  return (
    <div className={['rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 flex flex-col gap-1', className].join(' ')}>
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-2xl font-semibold leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub ? <div className="text-[11px] text-gray-500">{sub}</div> : null}
    </div>
  )
}

/** Compact chip with optional sizes for tight layouts */
function CompactChip({
  label, count, className = '', size = 'md'
}: { label: string; count: number; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  const sizeClasses =
    size === 'xs'
      ? 'h-6 min-w-[104px] px-2 text-[10px]'
      : size === 'sm'
      ? 'h-7 min-w-[120px] px-3 text-[11px]'
      : 'h-8 min-w-[140px] px-3 text-xs'
  const badgePad = size === 'xs' ? 'px-1.5 py-[1px] text-[10px]' : size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[11px]'
  return (
    <div
      className={[
        'inline-flex items-center justify-between rounded-full border border-gray-700 bg-gray-900',
        'whitespace-nowrap overflow-hidden', sizeClasses, className
      ].join(' ')}
      title={`${label} ${count}`}
    >
      <span className="font-medium text-gray-200 truncate">{label}</span>
      <span className={`ml-2 inline-flex items-center justify-center rounded-full border border-gray-600 bg-gray-800 ${badgePad} leading-none text-gray-300`}>
        {count}
      </span>
    </div>
  )
}

/** Split tile (always show all 3) */
function SplitTile({ name, count }: { name: 'Push'|'Pull'|'Legs'; count: number }) {
  return (
    <div className="h-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-600" />
        <span className="text-sm font-medium text-gray-200">{name}</span>
      </div>
      <span className="inline-flex items-center justify-center rounded-full border border-gray-700 bg-gray-800 h-6 min-w-[26px] text-[11px] px-2 text-gray-300">
        {count}
      </span>
    </div>
  )
}

/* -------------------------- Pager -------------------------- */
function Pager({
  page, totalPages, onPrev, onNext, className = '',
}: { page: number; totalPages: number; onPrev: () => void; onNext: () => void; className?: string }) {
  return (
    <div className={`grid grid-cols-3 items-center ${className}`}>
      <div className="justify-self-start">
        <button disabled={page <= 1} onClick={onPrev} className="text-xs text-gray-300 disabled:text-gray-600 hover:underline">
          ← Prev
        </button>
      </div>
      <div className="justify-self-center text-xs text-gray-400">
        Page {page} / {Math.max(1, totalPages)}
      </div>
      <div className="justify-self-end">
        <button disabled={page >= totalPages} onClick={onNext} className="text-xs text-gray-300 disabled:text-gray-600 hover:underline">
          Next →
        </button>
      </div>
    </div>
  )
}

/* -------------------------- component -------------------------- */
export default function DashboardClient({ lifts }: { lifts: GymLift[] }) {
  const [mode, setMode] = useState<RangeMode>('day')
  const [prevMode, setPrevMode] = useState<RangeMode | null>(null)

  // years present in data
  const allYears = useMemo(
    () => unique(lifts.map(l => new Date(l.date).getUTCFullYear())).sort((a, b) => b - a),
    [lifts]
  )
  const currentYear = new Date().getUTCFullYear()
  const initialYear = Math.min(currentYear, allYears[0] ?? currentYear)
  const [year, setYear] = useState<number>(initialYear)

  // selected day
  const [dayDate, setDayDate] = useState<string>(() => {
    if (!lifts.length) return todayUTCKey()
    const latest = lifts.reduce((m, l) => (l.date > m ? l.date : m), lifts[0].date)
    return clampToToday(latest)
  })

  const now = new Date()

  // date window
  const dateWindow = useMemo<string[]>(() => {
    if (mode === 'day')   return [dayDate]
    if (mode === 'week')  return lastNDatesUTC(7, now)
    if (mode === 'month') return lastNDatesUTC(30, now)
    return yearDatesYTDUTC(year)
  }, [mode, year, dayDate])

  const decYear = () => setYear(y => Math.max(1970, Math.min(currentYear, y - 1)))
  const incYear = () => setYear(y => Math.max(1970, Math.min(currentYear, y + 1)))

  // filtered lifts
  const filtered = useMemo<GymLift[]>(() => {
    const setDates = new Set(dateWindow)
    return lifts.filter(l => setDates.has(l.date))
  }, [lifts, dateWindow])

  const hasData = filtered.length > 0

  // last modified
  const lastModified = useMemo(() => {
    if (!lifts.length) return null
    const ts = Math.max(...lifts.map(l => new Date(l.timestamp).getTime()))
    return new Date(ts)
  }, [lifts])
  const lastModifiedStr = lastModified ? formatYMDHM_EST(lastModified) : ''

  // metrics
  const daily = useMemo(() => calcDailyVolume(filtered, dateWindow), [filtered, dateWindow])
  const totalVolume = useMemo(() => daily.reduce((s: number, d: any) => s + d.volume, 0), [daily])
  const exerciseVariety = useMemo(() => unique(filtered.map(l => l.exercise)).length, [filtered])

  // Body part stats (now with fuzzy fallback)
  const bodyStats = useMemo(() => {
    const base: Record<BodyPart, { volume: number; sets: number }> = {
      biceps:{volume:0,sets:0}, chest:{volume:0,sets:0}, shoulders:{volume:0,sets:0}, back:{volume:0,sets:0},
      triceps:{volume:0,sets:0}, quads:{volume:0,sets:0}, hamstrings:{volume:0,sets:0}, forearms:{volume:0,sets:0},
      core:{volume:0,sets:0}, glutes:{volume:0,sets:0}, calves:{volume:0,sets:0}, hips:{volume:0,sets:0},
    }

    for (const s of filtered) {
      const raw = (s.exercise ?? '').trim()
      const bp =
        (EXERCISE_TO_BODY[raw] as BodyPart | undefined) ??
        (EXERCISE_TO_BODY_LOWER[raw.toLowerCase()] as BodyPart | undefined) ??
        getBodyPartForExercise(raw)
      if (!bp) continue
      const v = s.weight * s.reps
      base[bp].volume += v
      base[bp].sets += 1
    }

    return base
  }, [filtered])


  /* -------------------------- Split & Body-part frequency -------------------------- */

  // Normalize P/P/L-ish tags
  function normalizeSplitTag(raw?: string | null) {
    const t = (raw || '').trim().toLowerCase()
    if (!t) return ''
    if (t.startsWith('push')) return 'Push'
    if (t.startsWith('pull')) return 'Pull'
    if (t.startsWith('leg'))  return 'Legs'
    return ''
  }

  // PPL-only counts (exactly 3 tiles shown)
  const splitCountsPPL = useMemo(() => {
    const byDate = groupBy(filtered, (l: GymLift) => l.date)
    const counts = { Push: 0, Pull: 0, Legs: 0 } as Record<'Push'|'Pull'|'Legs', number>
    const entries: Array<[string, GymLift[]]> = Array.from(byDate.entries())
    for (let i = 0; i < entries.length; i++) {
      const [, sets] = entries[i]
      const tags = (sets as GymLift[]).map((s: GymLift) => (cleanTag(s.dayTag) ?? '').trim()).filter(Boolean) as string[]
      if (!tags.length) continue
      const tally = new Map<string, number>()
      for (let j = 0; j < tags.length; j++) {
        const t = tags[j]
        tally.set(t, (tally.get(t) || 0) + 1)
      }
      const winner = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
      const key = normalizeSplitTag(winner) as 'Push'|'Pull'|'Legs'|''
      if (key) counts[key] += 1
    }
    return counts
  }, [filtered])

  const bodyPartsList = useMemo(() => {
    return (Object.keys(bodyStats) as BodyPart[])
      .map((bp) => ({ bp, sets: bodyStats[bp].sets, volume: bodyStats[bp].volume }))
      .filter(x => x.sets > 0 || x.volume > 0)
      .sort((a, b) => (b.sets - a.sets) || (b.volume - a.volume))
  }, [bodyStats])

  // Pagination for body parts — 6/page
  const [bpPage, setBpPage] = useState(1)
  const bpPageSize = 6
  const bodyPartsPaged = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(bodyPartsList.length / bpPageSize))
    const page = Math.max(1, Math.min(bpPage, totalPages))
    const start = (page - 1) * bpPageSize
    return {
      rows: bodyPartsList.slice(start, start + bpPageSize),
      totalPages,
      page,
      total: bodyPartsList.length
    }
  }, [bodyPartsList, bpPage])

  // PRs table rows
  const prsAll = useMemo(() => {
    const byEx = groupBy(filtered, (l: GymLift) => l.exercise)
    return Array.from(byEx.entries()).map(([exercise, sets]) => {
      let bestWeight = 0
      let best1RM = 0
      let bestSet: GymLift | undefined
      for (let i = 0; i < sets.length; i++) {
        const s = sets[i]
        const oneRM = Math.round(s.weight * (1 + s.reps / 30))
        if (!bestSet) { bestSet = s; bestWeight = s.weight; best1RM = oneRM; continue }
        const better =
          s.weight > bestSet.weight ||
          (s.weight === bestSet.weight && s.reps > bestSet.reps) ||
          (s.weight === bestSet.weight && s.reps === bestSet.reps && s.date > bestSet.date)
        if (better) { bestSet = s; bestWeight = s.weight; best1RM = oneRM }
      }
      return { exercise, bestWeight, best1RM, bestSetDate: bestSet?.date ?? '—', bestSet }
    })
  }, [filtered])

  const [sortKey, setSortKey] = useState<SortKey>('best1RM')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [prsPage, setPrsPage] = useState(1)
  const prsPageSize = 5
  const prsSortedPaged = useMemo(() => {
    const sorted = [...prsAll].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'exercise') return dir * a.exercise.localeCompare(b.exercise)
      if (sortKey === 'bestWeight') return dir * (a.bestWeight - b.bestWeight)
      if (sortKey === 'best1RM') return dir * (a.best1RM - b.best1RM)
      return dir * a.bestSetDate.localeCompare(b.bestSetDate)
    })
    const totalPages = Math.max(1, Math.ceil(sorted.length / prsPageSize))
    const page = Math.max(1, Math.min(prsPage, totalPages))
    const start = (page - 1) * prsPageSize
    return { rows: sorted.slice(start, start + prsPageSize), totalPages, page, total: sorted.length }
  }, [prsAll, sortKey, sortDir, prsPage])

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setSortDir('desc') }
    setPrsPage(1)
  }

  // recent sessions
  const recentSessionsAll = useMemo(() => {
    const byDate = groupBy(filtered, (l: GymLift) => l.date)
    const recentDates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : -1))
    return recentDates.map(date => {
      const day = byDate.get(date) || []
      const volume = day.reduce((s: number, l: GymLift) => s + l.weight * l.reps, 0)
      const exercises = unique(day.map((l: GymLift) => l.exercise))
      const sets = day.length

      const tags = day.map((l: GymLift) => cleanTag(l.dayTag)).filter(Boolean)
      let dayTag: string | null = null
      if (tags.length) {
        const counts = new Map<string, number>()
        for (let i = 0; i < tags.length; i++) {
          const t = tags[i]
          counts.set(t, (counts.get(t) || 0) + 1)
        }
        dayTag = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      }
      return { date, volume, exercises, sets, lifts: day, dayTag }
    })
  }, [filtered])

  const [sessPage, setSessPage] = useState(1)
  const sessPageSize = 3
  const recentSessions = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(recentSessionsAll.length / sessPageSize))
    const page = Math.max(1, Math.min(sessPage, totalPages))
    const start = (page - 1) * sessPageSize
    return { rows: recentSessionsAll.slice(start, start + sessPageSize), totalPages, page, total: recentSessionsAll.length }
  }, [recentSessionsAll, sessPage])

  // download modal
  const [showDownload, setShowDownload] = useState(false)
  const [dlRange, setDlRange] = useState<'current' | 'all'>('current')
  const [dlFormat, setDlFormat] = useState<'json' | 'csv'>('csv')
  const datasetMinDate = useMemo(() => (lifts.length ? lifts.reduce((m, l) => (l.date < m ? l.date : m), lifts[0].date) : ''), [lifts])
  const datasetMaxDate = useMemo(() => (lifts.length ? lifts.reduce((m, l) => (l.date > m ? l.date : m), lifts[0].date) : ''), [lifts])

  const buildDownloadUrl = () => {
    const base = dlFormat === 'json' ? '/api/gym-data' : '/api/gym-data.csv'
    let from = '', to = ''
    if (dlRange === 'current') { from = dateWindow[0]; to = dateWindow[dateWindow.length - 1] }
    else { from = datasetMinDate; to = datasetMaxDate }
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    qs.set('exclude', 'day_of_week,iso_week,month,year')
    const url = qs.toString() ? `${base}?${qs.toString()}` : base
    return url
  }

  const e1RMTooltip = 'Estimated 1RM = weight × (1 + reps/30)  (Epley formula)'
  const heatmapTooltip = 'Each column is a day. Darker = more total volume. Empty = no recorded sets.'

  /* ---------------------- Filters ---------------------- */
  const backVisible = mode === 'day' && !!prevMode

  const Filters = (
    <div
      className="grid items-center w-full gap-3 grid-cols-[96px_320px_220px] justify-start"
      aria-label="Dashboard filters"
    >
      {backVisible ? (
        <div className="col-start-1">
          <button
            type="button"
            title={`Back to ${prevMode}`}
            aria-label="Back"
            onClick={() => {
              if (!prevMode) return
              setMode(prevMode)
              setPrevMode(null)
              if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="h-9 w-full rounded-lg border text-[13px] bg-gray-900 border-gray-700 text-gray-200"
          >
            ← Back
          </button>
        </div>
      ) : null}

      <div className={backVisible ? 'col-start-2 col-span-1' : 'col-start-1 col-span-2'}>
        <div className="grid grid-cols-4 gap-1.5 w-full">
          {(['day','week','month','year'] as RangeMode[]).map(k => {
            const active = mode === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                aria-pressed={active}
                className={[
                  'h-9 w-full rounded-lg border text-[13px] leading-none',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
                  active
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800'
                ].join(' ')}
              >
                {k === 'day' ? 'Day' : k === 'week' ? 'Week' : k === 'month' ? 'Month' : 'Year'}
              </button>
            )
          })}
        </div>
      </div>

      <div className="col-start-3 h-9 flex items-center justify-start">
        {mode === 'day' ? (
          <div className="flex items-center gap-2">
            <button
              className="h-9 px-2 rounded-lg border bg-gray-900 hover:bg-gray-800 border-gray-700 disabled:opacity-40"
              onClick={() => setDayDate(d => shiftYMD(d, -1))}
              aria-label="Previous Day"
              disabled={datasetMinDate ? dayDate <= datasetMinDate : false}
            >
              ◀
            </button>
            <div className="min-w-[120px] text-center text-[13px] text-gray-300">
              {formatLongDate(dayDate)}
            </div>
            <button
              className="h-9 px-2 rounded-lg border bg-gray-900 hover:bg-gray-800 border-gray-700 disabled:opacity-40"
              onClick={() => setDayDate(d => clampToToday(shiftYMD(d, +1)))}
              aria-label="Next Day"
              disabled={dayDate >= todayUTCKey()}
            >
              ▶
            </button>
          </div>
        ) : mode === 'year' ? (
          <div className="flex items-center gap-2">
            <button
              className="h-9 px-2 rounded-lg border bg-gray-900 hover:bg-gray-800 border-gray-700"
              onClick={decYear}
              aria-label="Previous Year"
            >
              ◀
            </button>
            <div className="min-w-[64px] text-center text-[13px] text-gray-300">{year}</div>
            <button
              className="h-9 px-2 rounded-lg border bg-gray-900 hover:bg-gray-800 border-gray-700 disabled:opacity-40"
              onClick={incYear}
              aria-label="Next Year"
              disabled={year >= currentYear}
            >
              ▶
            </button>
          </div>
        ) : (
          <div className="h-9 w-full" />
        )}
      </div>
    </div>
  )

  const DownloadButton = (
    <button
      onClick={() => setShowDownload(true)}
      className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md"
    >
      Download Data
    </button>
  )

  const selectedExercises = useMemo(
    () => unique(filtered.map(l => l.exercise)).slice(0, 12),
    [filtered]
  )
  const dateFrom = dateWindow[0]
  const dateTo = dateWindow[dateWindow.length - 1]
  const insightScope: 'day' | 'week' | 'month' | 'year' = mode

  const jumpToDay = (d: string) => {
    if (mode !== 'day') setPrevMode(mode)
    setDayDate(clampToToday(d))
    setMode('day')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // KPI & small card height — unify d
  const KPI_CARD_HEIGHT = 'h-[150px]'
  const SMALL_CARD_HEIGHT = KPI_CARD_HEIGHT

  return (
    <div className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Utility Card row */}
        <div className="mt-4 mb-6">
          <UtilityCard
            filters={Filters}
            downloadButton={DownloadButton}
            lastModified={lastModifiedStr}
            insightContext={{
              scope: insightScope,
              selectedExercises,
              dateFrom,
              dateTo
            }}
          />
        </div>

        {!hasData ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <p className="text-gray-300">No data in this range.</p>
          </div>
        ) : mode === 'day' ? (
          <DailyView
            lifts={lifts}
            date={dayDate}
            onChangeDate={(newDate) => setDayDate(clampToToday(newDate))}
          />
        ) : (
          <>
            {/* KPI row + chart + body */}
            <section className="mb-6">
              <div className="grid lg:grid-cols-[1fr_1fr_1fr_0.85fr] lg:grid-rows-[auto_auto] gap-x-4 gap-y-4">
                {/* LEFT: KPI row + chart */}
                <div className="lg:col-span-3 lg:row-start-1 lg:row-end-2 grid grid-rows-[auto_1fr] gap-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* TOTAL VOLUME — 3-stack, but balanced with others */}
                    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${KPI_CARD_HEIGHT} flex flex-col items-center justify-center text-center`}>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        Total Volume
                      </div>
                      <div className="leading-tight font-semibold text-[clamp(1rem,3.4vw,2.1rem)] mb-2">
                        {formatNum(totalVolume)}
                      </div>
                      <div className="text-xs sm:text-sm tracking-wide text-gray-400">
                        lbs
                      </div>
                    </div>

                    {/* GYM DAYS — 2-stack but same total density */}
                    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${KPI_CARD_HEIGHT} flex flex-col items-center justify-center text-center`}>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        Gym Days
                      </div>
                      <div className="leading-tight font-semibold text-[clamp(1rem,3.4vw,2.1rem)]">
                        {unique(filtered.map(l => l.date)).length}
                        <span className="mx-1 text-gray-500">/</span>
                        {dateWindow.length}
                      </div>
                    </div>

                    {/* EXERCISE VARIETY — 2-stack */}
                    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${KPI_CARD_HEIGHT} flex flex-col items-center justify-center text-center`}>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        Exercise Variety
                      </div>
                      <div className="leading-tight font-semibold text-[clamp(1rem,3.4vw,2.1rem)]">
                        {exerciseVariety}
                      </div>
                    </div>

                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold">Daily Volume</h2>
                    </div>
                    <VolumeChart data={daily.map(d => ({ date: d.date, volume: d.volume }))} height={236} />
                  </div>
                </div>

                {/* RIGHT: Body diagram (fills both rows on the right) */}
                <BodyDiagram
                  stats={bodyStats}
                  className="lg:col-start-4 lg:row-span-2 h-full"
                />

                {/* ROW 2 LEFT: Split (3 tiles) + Body-part frequency */}
                <div className="lg:col-span-3 lg:row-start-2 lg:row-end-3 grid lg:grid-cols-2 gap-4">
                  {/* Split Frequency — EXACTLY 3 tiles, stretch to full card height */}
                  <div className={`bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 ${SMALL_CARD_HEIGHT} flex flex-col`}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-semibold">Split Frequency</h2>
                      <div className="text-[11px] text-gray-400">
                        {dateWindow[0]} – {dateWindow[dateWindow.length - 1]}
                      </div>
                    </div>
                    {/* Make the tiles fill the vertical space of the card */}
                    <div className="mt-1 grid grid-cols-3 gap-2 auto-rows-[1fr] items-stretch flex-1 min-h-0">
                      <SplitTile name="Push"  count={splitCountsPPL.Push} />
                      <SplitTile name="Pull"  count={splitCountsPPL.Pull} />
                      <SplitTile name="Legs"  count={splitCountsPPL.Legs} />
                    </div>
                  </div>

                  {/* Body-part Frequency — micro chips */}
                  <div className={`bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 ${SMALL_CARD_HEIGHT} flex flex-col`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <h2 className="text-sm font-semibold">Body-part Frequency</h2>
                      <span className="text-[11px] text-gray-400">
                        {bodyPartsPaged.total} groups
                      </span>
                    </div>

                    {bodyPartsPaged.rows.length === 0 ? (
                      <div className="text-xs text-gray-400 mt-auto mb-auto">No sets in this range.</div>
                    ) : (
                      <div className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-1.5">
                        {bodyPartsPaged.rows.map(({ bp, sets }) => (
                          <CompactChip
                            key={bp}
                            label={bp.charAt(0).toUpperCase() + bp.slice(1)}
                            count={sets}
                            size="xs"
                          />
                        ))}
                      </div>
                    )}

                    <Pager
                      page={bodyPartsPaged.page}
                      totalPages={bodyPartsPaged.totalPages}
                      onPrev={() => setBpPage(p => Math.max(1, p - 1))}
                      onNext={() => setBpPage(p => Math.min(bodyPartsPaged.totalPages, p + 1))}
                      className="mt-auto"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* PRs + Heatmap */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold">Exercise PRs</h2>
                  <Tooltip text={e1RMTooltip}>
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-600 text-[10px] leading-none"
                      aria-label="Estimated 1RM formula info"
                    >
                      i
                    </span>
                  </Tooltip>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-800 select-none">
                        <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('exercise')}>
                          Exercise {sortKey === 'exercise' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('bestWeight')}>
                          Best Weight {sortKey === 'bestWeight' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('best1RM')}>
                          Best 1RM (est) {sortKey === 'best1RM' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th className="py-2 pr-4">Best Set</th>
                        <th className="py-2 pr-4 cursor-pointer" onClick={() => toggleSort('bestSetDate')}>
                          Date {sortKey === 'bestSetDate' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {prsSortedPaged.rows.map((row) => (
                        <tr key={row.exercise} className="border-b border-gray-800/60">
                          <td className="py-2 pr-4">{row.exercise}</td>
                          <td className="py-2 pr-4">{row.bestWeight} lbs</td>
                          <td className="py-2 pr-4">{row.best1RM} lbs</td>
                          <td className="py-2 pr-4 text-gray-300">
                            {row.bestSet ? `${row.bestSet.weight} × ${row.bestSet.reps}` : '—'}
                          </td>
                          <td className="py-2 pr-4">
                            {row.bestSetDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  page={prsSortedPaged.page}
                  totalPages={prsSortedPaged.totalPages}
                  onPrev={() => setPrsPage(p => Math.max(1, p - 1))}
                  onNext={() => setPrsPage(p => Math.min(prsSortedPaged.totalPages, p + 1))}
                  className="mt-3"
                />
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold">Volume Heatmap</h2>
                  <Tooltip text={heatmapTooltip}>
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-600 text-[10px] leading-none"
                      aria-label="Heatmap info"
                    >
                      i
                    </span>
                  </Tooltip>
                </div>
                <div className="flex-1">
                  <Heatmap
                    mode={mode as 'week' | 'month' | 'year'}
                    data={daily.map(d => ({ date: d.date, volume: d.volume }))}
                    naColor="#3b4351"
                    autoGrow
                  />
                </div>
              </div>
            </section>

            {/* Recent sessions */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Sessions</h2>
                <Pager
                  page={recentSessions.page}
                  totalPages={recentSessions.totalPages}
                  onPrev={() => setSessPage(p => Math.max(1, p - 1))}
                  onNext={() => setSessPage(p => Math.min(recentSessions.totalPages, p + 1))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentSessions.rows.map((s) => (
                  <Tooltip key={s.date} text="Open Daily View">
                    <button
                      onClick={() => jumpToDay(s.date)}
                      className="text-left bg-gray-800/60 hover:bg-gray-800 transition-colors rounded-lg px-4 py-4 border border-gray-700/60 hover:border-gray-600 group w-full"
                      aria-label={`Open daily view for ${s.date}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold tracking-wide">
                          {formatLongDate(s.date)}
                          {s.dayTag ? `: ${titleCaseTag(cleanTag(s.dayTag))}` : ''}
                        </div>
                        <div className="text-xs text-gray-400 group-hover:text-gray-300">
                          {formatNum(s.volume)} lbs
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
                        <span className="inline-block px-2 py-1 bg-gray-900 rounded">
                          {s.exercises.length} exercise{s.exercises.length === 1 ? '' : 's'}
                        </span>
                        <span className="inline-block px-2 py-1 bg-gray-900 rounded">
                          {s.sets} set{s.sets === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="mt-3 text-[11px] italic text-gray-500">
                        Click to open Daily View
                      </div>
                    </button>
                  </Tooltip>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Download modal */}
      {showDownload && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">Download Dataset</h3>
              <button onClick={() => setShowDownload(false)} className="text-gray-400 hover:text-gray-200" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div>
                <div className="text-gray-300 mb-2">Range</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`px-3 py-2 rounded-lg border ${dlRange === 'current' ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}
                    onClick={() => setDlRange('current')}
                  >
                    Current filter
                  </button>
                  <button
                    className={`px-3 py-2 rounded-lg border ${dlRange === 'all' ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}
                    onClick={() => setDlRange('all')}
                  >
                    All time
                  </button>
                </div>
              </div>

              <div>
                <div className="text-gray-300 mb-2">Format</div>
                <div className="inline-flex rounded-lg overflow-hidden border border-gray-700">
                  <button
                    className={`px-4 py-2 text-sm ${dlFormat === 'csv' ? 'bg-blue-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                    onClick={() => setDlFormat('csv')}
                  >
                    CSV
                  </button>
                  <button
                    className={`px-4 py-2 text-sm ${dlFormat === 'json' ? 'bg-blue-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                    onClick={() => setDlFormat('json')}
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-2">
              <button onClick={() => setShowDownload(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                Cancel
              </button>
              <a
                href={buildDownloadUrl()}
                onClick={() => setShowDownload(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
