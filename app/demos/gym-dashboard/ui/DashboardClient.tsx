// app/demos/gym-dashboard/ui/DashboardClient.tsx
'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import type { GymLift } from '../form/actions'
import ChatClient from '../chat/ChatClient'
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
          <div className="rounded-lg border border-white/20 shadow-2xl px-3 py-2 text-xs font-medium bg-black/95 backdrop-blur-sm text-white/90">
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

/* -------------------------- Small UI atoms -------------------------- */
function StatChip({ label, value, sub, className }: {
  label: string; value: number | string; sub?: string; className?: string
}) {
  return (
    <div className={['rounded-xl border border-white/12 bg-white/[0.02] px-4 py-3.5 flex flex-col gap-2 hover:border-[#54b3d6]/30 transition-all', className].join(' ')}>
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{label}</div>
      <div className="text-2xl font-bold leading-none font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub ? <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">{sub}</div> : null}
    </div>
  )
}

function CompactChip({
  label, count, className = '', size = 'md'
}: { label: string; count: number; className?: string; size?: 'xs' | 'sm' | 'md' }) {
  const sizeClasses =
    size === 'xs'
      ? 'h-7 min-w-[104px] px-2.5 text-[11px]'
      : size === 'sm'
      ? 'h-8 min-w-[120px] px-3 text-xs'
      : 'h-9 min-w-[140px] px-3.5 text-sm'
  const badgePad = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
  return (
    <div
      className={[
        'inline-flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03]',
        'whitespace-nowrap overflow-hidden hover:border-white/20 transition-colors', sizeClasses, className
      ].join(' ')}
      title={`${label} ${count}`}
    >
      <span className="font-semibold text-white/80 truncate">{label}</span>
      <span className={`ml-2 inline-flex items-center justify-center rounded-md border border-white/20 bg-white/10 ${badgePad} leading-none font-bold text-white/90 font-mono`} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </div>
  )
}

function SplitTile({ name, count }: { name: 'Push'|'Pull'|'Legs'; count: number }) {
  const colors = {
    Push: 'bg-red-500/20 border-red-500/30 shadow-red-500/10',
    Pull: 'bg-blue-500/20 border-blue-500/30 shadow-blue-500/10',
    Legs: 'bg-green-500/20 border-green-500/30 shadow-green-500/10',
  }
  const dotColors = {
    Push: 'bg-red-400',
    Pull: 'bg-blue-400',
    Legs: 'bg-green-400',
  }
  return (
    <div className="h-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 flex flex-col gap-2 hover:border-white/20 transition-all">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dotColors[name]} shadow-lg`} />
        <span className="text-sm font-bold text-white/90">{name}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold font-mono leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">days</span>
      </div>
    </div>
  )
}

/* -------------------------- Pager -------------------------- */
function Pager({
  page, totalPages, onPrev, onNext, className = '',
}: { page: number; totalPages: number; onPrev: () => void; onNext: () => void; className?: string }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <button
        disabled={page <= 1}
        onClick={onPrev}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/70 disabled:text-white/20 hover:text-white disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>
      <div className="text-xs font-mono text-white/40 font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {page} / {Math.max(1, totalPages)}
      </div>
      <button
        disabled={page >= totalPages}
        onClick={onNext}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/70 disabled:text-white/20 hover:text-white disabled:cursor-not-allowed transition-colors"
      >
        Next
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

/* -------------------------- component -------------------------- */
export default function DashboardClient({ lifts }: { lifts: GymLift[] }) {
  const [mode, setMode] = useState<RangeMode>('day')
  const [prevMode, setPrevMode] = useState<RangeMode | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const [bubbleOffset, setBubbleOffset] = useState({ x: 0, y: 0 })

  const clampBubble = useCallback(() => {
    const el = bubbleRef.current
    if (!el || typeof window === 'undefined') return
    const rect = el.getBoundingClientRect()
    const padding = 12
    let dx = 0
    let dy = 0
    const maxRight = window.innerWidth - padding
    const maxBottom = window.innerHeight - padding
    if (rect.right > maxRight) dx -= rect.right - maxRight
    if (rect.left < padding) dx += padding - rect.left
    if (rect.bottom > maxBottom) dy -= rect.bottom - maxBottom
    if (rect.top < padding) dy += padding - rect.top
    if (dx !== 0 || dy !== 0) {
      setBubbleOffset(current => ({
        x: Math.round(current.x + dx),
        y: Math.round(current.y + dy),
      }))
    }
  }, [])

  useEffect(() => {
    const handleResize = () => requestAnimationFrame(clampBubble)
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [clampBubble])

  useEffect(() => {
    const frame = requestAnimationFrame(clampBubble)
    return () => cancelAnimationFrame(frame)
  }, [isChatOpen, clampBubble])

  const allYears = useMemo(
    () => unique(lifts.map(l => new Date(l.date).getUTCFullYear())).sort((a, b) => b - a),
    [lifts]
  )
  const currentYear = new Date().getUTCFullYear()
  const initialYear = Math.min(currentYear, allYears[0] ?? currentYear)
  const [year, setYear] = useState<number>(initialYear)

  const [dayDate, setDayDate] = useState<string>(() => {
    if (!lifts.length) return todayUTCKey()
    const latest = lifts.reduce((m, l) => (l.date > m ? l.date : m), lifts[0].date)
    return clampToToday(latest)
  })

  const now = new Date()

  const dateWindow = useMemo<string[]>(() => {
    if (mode === 'day')   return [dayDate]
    if (mode === 'week')  return lastNDatesUTC(7, now)
    if (mode === 'month') return lastNDatesUTC(30, now)
    return yearDatesYTDUTC(year)
  }, [mode, year, dayDate])

  const decYear = () => setYear(y => Math.max(1970, Math.min(currentYear, y - 1)))
  const incYear = () => setYear(y => Math.max(1970, Math.min(currentYear, y + 1)))

  const filtered = useMemo<GymLift[]>(() => {
    const setDates = new Set(dateWindow)
    return lifts.filter(l => setDates.has(l.date))
  }, [lifts, dateWindow])

  const hasData = filtered.length > 0

  const lastModified = useMemo(() => {
    if (!lifts.length) return null
    const ts = Math.max(...lifts.map(l => new Date(l.timestamp).getTime()))
    return new Date(ts)
  }, [lifts])
  const lastModifiedStr = lastModified ? formatYMDHM_EST(lastModified) : ''

  const daily = useMemo(() => calcDailyVolume(filtered, dateWindow), [filtered, dateWindow])
  const totalVolume = useMemo(() => daily.reduce((s: number, d: any) => s + d.volume, 0), [daily])
  const exerciseVariety = useMemo(() => unique(filtered.map(l => l.exercise)).length, [filtered])

  // Body part stats — STRICT mapping (no regex or fuzzy)
  const bodyStats = useMemo(() => {
    const base: Record<BodyPart, { volume: number; sets: number }> = {
      biceps:{volume:0,sets:0}, chest:{volume:0,sets:0}, shoulders:{volume:0,sets:0}, back:{volume:0,sets:0},
      triceps:{volume:0,sets:0}, quads:{volume:0,sets:0}, hamstrings:{volume:0,sets:0}, forearms:{volume:0,sets:0},
      core:{volume:0,sets:0}, glutes:{volume:0,sets:0}, calves:{volume:0,sets:0}, hips:{volume:0,sets:0},
    }
    for (const s of filtered) {
      const bp = EXERCISE_TO_BODY[s.exercise] // exact, hard-coded names only
      if (!bp) continue
      base[bp].volume += s.weight * s.reps
      base[bp].sets += 1
    }
    return base
  }, [filtered])

  /* -------------------------- Split & Body-part frequency -------------------------- */
  function normalizeSplitTag(raw?: string | null) {
    const t = (raw || '').trim().toLowerCase()
    if (!t) return ''
    if (t.startsWith('push')) return 'Push'
    if (t.startsWith('pull')) return 'Pull'
    if (t.startsWith('leg'))  return 'Legs'
    return ''
  }

  // Count how many Push/Pull/Legs DAYS in-range (majority tag per day)
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
  const heatmapTooltip = 'Each column is a day. Green = more total volume. Red = less total volume. Empty = no recorded sets.'

  const backVisible = mode === 'day' && !!prevMode

  const Filters = (
    <div className="w-full" aria-label="Dashboard filters">
      {/* Range selector buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['day','week','month','year'] as RangeMode[]).map(k => {
          const active = mode === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              aria-pressed={active}
              className={[
                'h-11 sm:h-10 px-3 rounded-lg border text-sm font-semibold tracking-wide transition-all touch-target',
                'focus:outline-none focus:ring-2 focus:ring-[#54b3d6]/40 active:scale-95',
                active
                  ? 'bg-[#54b3d6] border-[#54b3d6] text-black shadow-lg shadow-[#54b3d6]/20'
                  : 'bg-white/[0.05] border-white/15 text-white/80 hover:bg-white/[0.08] hover:border-[#54b3d6]/30 hover:text-white'
              ].join(' ')}
            >
              {k === 'day' ? 'Day' : k === 'week' ? '7d' : k === 'month' ? '30d' : 'YTD'}
            </button>
          )
        })}
      </div>
    </div>
  )

  const DateNavigation = mode === 'day' || mode === 'year' ? (
    <div className="flex items-center gap-2">
      {backVisible && mode === 'day' && (
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
          className="h-11 sm:h-10 px-3 sm:px-4 rounded-lg border text-sm font-medium bg-white/[0.05] border-white/15 text-white/80 hover:bg-white/[0.08] hover:border-[#54b3d6]/30 transition-all active:scale-95 touch-target"
        >
          <span className="hidden sm:inline">← Back</span>
          <span className="sm:hidden">←</span>
        </button>
      )}
      <button
        className="h-11 sm:h-10 w-11 sm:w-10 flex items-center justify-center rounded-lg border bg-white/[0.05] hover:bg-white/[0.08] border-white/15 hover:border-[#54b3d6]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 touch-target"
        onClick={mode === 'day' ? () => setDayDate(d => shiftYMD(d, -1)) : decYear}
        aria-label={mode === 'day' ? 'Previous Day' : 'Previous Year'}
        disabled={mode === 'day' && datasetMinDate ? dayDate <= datasetMinDate : false}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="M12.7 5.3a1 1 0 0 1 0 1.4L9.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4l-4-4a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 0z" />
        </svg>
      </button>
      <div className="flex-1 min-w-[160px] max-w-[200px] text-center text-sm font-medium text-white/80 font-mono px-2">
        {mode === 'day' ? formatLongDate(dayDate) : year}
      </div>
      <button
        className="h-11 sm:h-10 w-11 sm:w-10 flex items-center justify-center rounded-lg border bg-white/[0.05] hover:bg-white/[0.08] border-white/15 hover:border-[#54b3d6]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 touch-target"
        onClick={mode === 'day' ? () => setDayDate(d => clampToToday(shiftYMD(d, +1))) : incYear}
        aria-label={mode === 'day' ? 'Next Day' : 'Next Year'}
        disabled={mode === 'day' ? dayDate >= todayUTCKey() : year >= currentYear}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="M7.3 14.7a1 1 0 0 1 0-1.4l3.3-3.3-3.3-3.3a1 1 0 0 1 1.4-1.4l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0z" />
        </svg>
      </button>
    </div>
  ) : null

  const DownloadButton = (
    <button
      onClick={() => setShowDownload(true)}
      className="w-full sm:w-auto h-11 sm:h-10 px-4 text-sm font-semibold bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 hover:border-[#54b3d6]/30 rounded-lg transition-all flex items-center justify-center gap-2 touch-target active:scale-95"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download
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

  const KPI_CARD_HEIGHT = 'h-[150px]'
  const SMALL_CARD_HEIGHT = KPI_CARD_HEIGHT

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {/* Hero Header - Mobile optimized */}
        <div className="pt-20 pb-6 sm:pb-8 border-b border-white/5">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-[#54b3d6]/10 border border-[#54b3d6]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#54b3d6] animate-pulse" />
                <span className="text-xs font-medium text-[#54b3d6] uppercase tracking-wider">Live Data</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-none mb-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                Workout Analytics
              </h1>
              <p className="text-sm sm:text-base text-white/50 max-w-xl">
                Real-time performance metrics and training data visualization
              </p>
            </div>
            {lastModifiedStr ? (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono truncate">{lastModifiedStr}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Control Panel - Mobile optimized */}
        <div className="mt-6 sm:mt-8 mb-6 sm:mb-8">
          <UtilityCard
            filters={Filters}
            dateNavigation={DateNavigation}
            downloadButton={DownloadButton}
            insightContext={{ scope: insightScope, selectedExercises, dateFrom, dateTo }}
          />
        </div>

        {!hasData ? (
          <div className="bg-white/[0.02] border border-white/12 rounded-xl p-8 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-white/60 text-sm sm:text-base font-medium">No workout data in this range</p>
            <p className="text-white/40 text-xs sm:text-sm mt-1">Try selecting a different time period</p>
          </div>
        ) : mode === 'day' ? (
          <DailyView lifts={lifts} date={dayDate} onChangeDate={(newDate) => setDayDate(clampToToday(newDate))} />
        ) : (
          <>
            {/* Metrics Grid - Mobile-first responsive layout */}
            <section className="space-y-4 mb-8">
              {/* KPI Cards - Stack on mobile, grid on tablet+ - CENTERED TEXT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* TOTAL VOLUME */}
                <div className="group relative bg-white/[0.02] border border-white/12 rounded-xl p-5 sm:p-6 hover:border-[#54b3d6]/30 transition-all overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative text-center">
                    <div className="dashboard-stat-label mb-3">Total Volume</div>
                    <div className="dashboard-stat-value text-3xl sm:text-4xl lg:text-5xl mb-2">{formatNum(totalVolume)}</div>
                    <div className="text-xs font-semibold tracking-wider text-white/50 uppercase">lbs</div>
                  </div>
                </div>

                {/* GYM DAYS */}
                <div className="group relative bg-white/[0.02] border border-white/12 rounded-xl p-5 sm:p-6 hover:border-[#54b3d6]/30 transition-all overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative text-center">
                    <div className="dashboard-stat-label mb-3">Gym Days</div>
                    <div className="dashboard-stat-value text-3xl sm:text-4xl lg:text-5xl">
                      {unique(filtered.map(l => l.date)).length}
                      <span className="text-xl sm:text-2xl mx-2 text-white/30">/</span>
                      {dateWindow.length}
                    </div>
                  </div>
                </div>

                {/* EXERCISE VARIETY */}
                <div className="group relative bg-white/[0.02] border border-white/12 rounded-xl p-5 sm:p-6 hover:border-[#54b3d6]/30 transition-all overflow-hidden sm:col-span-2 lg:col-span-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative text-center">
                    <div className="dashboard-stat-label mb-3">Exercise Variety</div>
                    <div className="dashboard-stat-value text-3xl sm:text-4xl lg:text-5xl">{exerciseVariety}</div>
                  </div>
                </div>
              </div>

              {/* Main content grid - Proper stacking on all screen sizes */}
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
                {/* Left column: Chart + Stats */}
                <div className="space-y-4 min-w-0">
                  {/* Daily Volume Chart */}
                  <div className="bg-white/[0.02] border border-white/12 rounded-xl p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base sm:text-lg font-bold tracking-tight text-center sm:text-left w-full">Daily Volume</h2>
                    </div>
                    <VolumeChart data={daily.map(d => ({ date: d.date, volume: d.volume }))} height={200} />
                  </div>

                  {/* Split & Body-part frequency - Stack on mobile, side-by-side on tablet+ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Split Frequency */}
                    <div className="bg-white/[0.02] border border-white/12 rounded-xl p-4 sm:p-5 flex flex-col min-h-[180px]">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                        <h2 className="text-base font-bold tracking-tight text-center sm:text-left">Split Frequency</h2>
                        <div className="text-[10px] font-mono text-white/40 truncate text-center sm:text-right">
                          {dateWindow[0]} – {dateWindow[dateWindow.length - 1]}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
                        <SplitTile name="Push" count={splitCountsPPL.Push} />
                        <SplitTile name="Pull" count={splitCountsPPL.Pull} />
                        <SplitTile name="Legs" count={splitCountsPPL.Legs} />
                      </div>
                    </div>

                    {/* Body-part Frequency */}
                    <div className="bg-white/[0.02] border border-white/12 rounded-xl p-4 sm:p-5 flex flex-col min-h-[180px]">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold tracking-tight text-center sm:text-left flex-1">Body Part Frequency</h2>
                        <span className="text-[10px] font-mono text-white/40 flex-shrink-0">
                          {bodyPartsPaged.total} groups
                        </span>
                      </div>

                      {bodyPartsPaged.rows.length === 0 ? (
                        <div className="text-sm text-white/40 flex-1 flex items-center justify-center">No sets in this range</div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2 flex-1 content-start">
                          {bodyPartsPaged.rows.map(({ bp, sets }) => (
                            <CompactChip key={bp} label={bp.charAt(0).toUpperCase() + bp.slice(1)} count={sets} size="xs" />
                          ))}
                        </div>
                      )}

                      <Pager
                        page={bodyPartsPaged.page}
                        totalPages={bodyPartsPaged.totalPages}
                        onPrev={() => setBpPage(p => Math.max(1, p - 1))}
                        onNext={() => setBpPage(p => Math.min(bodyPartsPaged.totalPages, p + 1))}
                        className="mt-4 pt-4 border-t border-white/5"
                      />
                    </div>
                  </div>
                </div>

                {/* Right column: Body diagram - Stacks below on mobile/tablet, sidebar on xl+ */}
                <div className="w-full xl:w-auto">
                  <BodyDiagram
                    stats={bodyStats}
                    splitCounts={splitCountsPPL}
                    className="h-full min-h-[400px] xl:sticky xl:top-24 w-full"
                  />
                </div>
              </div>
            </section>

            {/* PRs + Heatmap - Stack on mobile, side-by-side on desktop */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              {/* Exercise PRs Table - Mobile optimized with horizontal scroll */}
              <div className="bg-white/[0.02] border border-white/12 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-4 sm:mb-5">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight leading-none">Exercise PRs</h2>
                  <Tooltip text={e1RMTooltip}>
                    <button className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 hover:border-[#54b3d6]/50 text-[10px] font-bold leading-none hover:bg-[#54b3d6]/10 transition-all flex-shrink-0 -mt-0.5" aria-label="Estimated 1RM formula info">i</button>
                  </Tooltip>
                </div>

                {/* Mobile-friendly horizontal scroll wrapper */}
                <div className="overflow-x-auto -mx-4 sm:-mx-6 scrollbar-hide">
                  <div className="inline-block min-w-full px-4 sm:px-6">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-white/40 border-b border-white/5 select-none">
                          <th className="py-3 pr-4 sm:pr-6 text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors whitespace-nowrap" onClick={() => toggleSort('exercise')}>
                            Exercise {sortKey === 'exercise' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="py-3 pr-4 sm:pr-6 text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors whitespace-nowrap" onClick={() => toggleSort('bestWeight')}>
                            Weight {sortKey === 'bestWeight' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="py-3 pr-4 sm:pr-6 text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors whitespace-nowrap" onClick={() => toggleSort('best1RM')}>
                            Est 1RM {sortKey === 'best1RM' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                          </th>
                          <th className="py-3 pr-4 sm:pr-6 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Best Set</th>
                          <th className="py-3 text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-white/60 transition-colors whitespace-nowrap" onClick={() => toggleSort('bestSetDate')}>
                            Date {sortKey === 'bestSetDate' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {prsSortedPaged.rows.map((row, idx) => (
                          <tr key={row.exercise} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${idx === prsSortedPaged.rows.length - 1 ? 'border-0' : ''}`}>
                            <td className="py-3 pr-4 sm:pr-6 font-medium whitespace-nowrap">{row.exercise}</td>
                            <td className="py-3 pr-4 sm:pr-6 font-mono text-white/80 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.bestWeight} lbs</td>
                            <td className="py-3 pr-4 sm:pr-6 font-mono text-white/80 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.best1RM} lbs</td>
                            <td className="py-3 pr-4 sm:pr-6 font-mono text-white/60 whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.bestSet ? `${row.bestSet.weight} × ${row.bestSet.reps}` : '—'}</td>
                            <td className="py-3 font-mono text-white/60 text-xs whitespace-nowrap">{row.bestSetDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Pager
                  page={prsSortedPaged.page}
                  totalPages={prsSortedPaged.totalPages}
                  onPrev={() => setPrsPage(p => Math.max(1, p - 1))}
                  onNext={() => setPrsPage(p => Math.min(prsSortedPaged.totalPages, p + 1))}
                  className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-white/5"
                />
              </div>

              {/* Volume Heatmap - Mobile optimized with min-width to prevent disappearing */}
              <div className="bg-white/[0.02] border border-white/12 rounded-xl p-4 sm:p-6 flex flex-col min-h-[280px]">
                <div className="flex items-center gap-2 mb-4 sm:mb-5 justify-center sm:justify-start">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight leading-none">Volume Heatmap</h2>
                  <Tooltip text={heatmapTooltip}>
                    <button className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 hover:border-[#54b3d6]/50 text-[10px] font-bold leading-none hover:bg-[#54b3d6]/10 transition-all flex-shrink-0 -mt-0.5" aria-label="Heatmap info">i</button>
                  </Tooltip>
                </div>
                <div className="flex-1 min-h-[200px] overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide">
                  <div className="min-w-[300px] h-full">
                    <Heatmap mode={mode as 'week' | 'month' | 'year'} data={daily.map(d => ({ date: d.date, volume: d.volume }))} naColor="#3b4351" autoGrow />
                  </div>
                </div>
              </div>
            </section>

            {/* Recent sessions - Mobile optimized cards */}
            <section className="bg-white/[0.02] border border-white/12 rounded-xl p-4 sm:p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-center sm:text-left w-full sm:w-auto">Recent Sessions</h2>
                <Pager
                  page={recentSessions.page}
                  totalPages={recentSessions.totalPages}
                  onPrev={() => setSessPage(p => Math.max(1, p - 1))}
                  onNext={() => setSessPage(p => Math.min(recentSessions.totalPages, p + 1))}
                />
              </div>

              {/* Stack vertically on mobile, grid on tablet+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentSessions.rows.map((s) => (
                  <Tooltip key={s.date} text="Click to view detailed breakdown">
                    <button
                      onClick={() => jumpToDay(s.date)}
                      className="group relative text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/12 hover:border-[#54b3d6]/40 transition-all rounded-lg p-4 w-full overflow-hidden active:scale-98 touch-target"
                      aria-label={`Open daily view for ${s.date}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/0 to-[#54b3d6]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm tracking-tight mb-0.5 truncate">
                              {formatLongDate(s.date)}
                            </div>
                            {s.dayTag && (
                              <div className="text-xs font-semibold text-[#54b3d6] truncate">
                                {titleCaseTag(cleanTag(s.dayTag))}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-xs font-mono text-white/60 font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatNum(s.volume)} lbs
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-md text-[11px] font-semibold text-white/70">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.exercises.length}</span> ex
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-md text-[11px] font-semibold text-white/70 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            {s.sets} sets
                          </span>
                        </div>
                      </div>
                    </button>
                  </Tooltip>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Chat Bubble - Mobile optimized positioning */}
      <div
        ref={bubbleRef}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3"
        style={{ transform: `translate(${bubbleOffset.x}px, ${bubbleOffset.y}px)` }}
      >
        {isChatOpen ? (
          <div className="h-[calc(100vh-120px)] sm:h-[75vh] max-h-[640px] w-[calc(100vw-32px)] sm:w-[min(460px,94vw)] overflow-hidden rounded-2xl bg-[#0d1117] border border-white/10 shadow-2xl backdrop-blur">
            <ChatClient embedded onClose={() => setIsChatOpen(false)} />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setIsChatOpen(current => !current)}
          aria-label={isChatOpen ? 'Close gym chat' : 'Open gym chat'}
          className="group flex h-14 w-14 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-[#54b3d6]/40 bg-[#54b3d6]/20 backdrop-blur-sm text-xl font-bold text-white shadow-lg shadow-[#54b3d6]/20 hover:border-[#54b3d6]/60 hover:bg-[#54b3d6]/30 hover:shadow-xl hover:shadow-[#54b3d6]/30 transition-all active:scale-95 touch-target"
        >
          {isChatOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Download modal - Mobile bottom sheet / Desktop centered modal */}
      {showDownload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowDownload(false)}>
          <div
            className="bg-black/95 border border-white/20 rounded-t-2xl sm:rounded-xl max-w-md w-full shadow-2xl animate-slide-up sm:animate-none max-h-[90vh] sm:max-h-none overflow-auto backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 sticky top-0 bg-black/95 backdrop-blur-sm z-10">
              <h3 className="text-base sm:text-lg font-bold tracking-tight">Download Dataset</h3>
              <button
                onClick={() => setShowDownload(false)}
                className="text-white/40 hover:text-white transition-colors p-1 touch-target"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Range selector */}
              <div>
                <div className="text-xs sm:text-sm font-bold text-white/80 mb-3 uppercase tracking-wider">Range</div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    className={`px-3 sm:px-4 py-3 rounded-lg border text-sm font-semibold transition-all touch-target active:scale-95 ${
                      dlRange === 'current'
                        ? 'bg-[#54b3d6] border-[#54b3d6] text-black shadow-lg shadow-[#54b3d6]/20'
                        : 'bg-white/[0.05] border-white/15 text-white/80 hover:bg-white/[0.08] hover:border-[#54b3d6]/30'
                    }`}
                    onClick={() => setDlRange('current')}
                  >
                    Current filter
                  </button>
                  <button
                    className={`px-3 sm:px-4 py-3 rounded-lg border text-sm font-semibold transition-all touch-target active:scale-95 ${
                      dlRange === 'all'
                        ? 'bg-[#54b3d6] border-[#54b3d6] text-black shadow-lg shadow-[#54b3d6]/20'
                        : 'bg-white/[0.05] border-white/15 text-white/80 hover:bg-white/[0.08] hover:border-[#54b3d6]/30'
                    }`}
                    onClick={() => setDlRange('all')}
                  >
                    All time
                  </button>
                </div>
              </div>

              {/* Format selector */}
              <div>
                <div className="text-xs sm:text-sm font-bold text-white/80 mb-3 uppercase tracking-wider">Format</div>
                <div className="inline-flex w-full sm:w-auto rounded-lg border border-white/10 overflow-hidden">
                  <button
                    className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2.5 text-sm font-semibold transition-all touch-target active:scale-95 ${
                      dlFormat === 'csv'
                        ? 'bg-[#54b3d6] text-black'
                        : 'bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                    }`}
                    onClick={() => setDlFormat('csv')}
                  >
                    CSV
                  </button>
                  <button
                    className={`flex-1 sm:flex-none px-4 sm:px-5 py-3 sm:py-2.5 text-sm font-semibold transition-all touch-target active:scale-95 ${
                      dlFormat === 'json'
                        ? 'bg-[#54b3d6] text-black'
                        : 'bg-white/[0.03] text-white/70 hover:bg-white/[0.06]'
                    }`}
                    onClick={() => setDlFormat('json')}
                  >
                    JSON
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-[#0a0a0a]">
              <button
                onClick={() => setShowDownload(false)}
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/15 hover:border-white/20 rounded-lg text-sm font-semibold transition-all touch-target active:scale-95"
              >
                Cancel
              </button>
              <a
                href={buildDownloadUrl()}
                onClick={() => setShowDownload(false)}
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-[#54b3d6] hover:bg-[#6dc5e8] text-black rounded-lg text-sm font-bold transition-all shadow-lg shadow-[#54b3d6]/20 flex items-center justify-center gap-2 touch-target active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
