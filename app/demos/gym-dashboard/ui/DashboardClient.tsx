// app/demos/gym-dashboard/ui/DashboardClient.tsx
'use client'

import { useMemo, useState } from 'react'
import type { GymLift } from '../form/actions'
import VolumeChart from './VolumeChart'
import Heatmap from './Heatmap'

type RangeMode = 'month' | 'week' | 'year'
type SortKey = 'exercise' | 'bestWeight' | 'best1RM' | 'bestSetDate'

/* -------------------------- tiny helpers -------------------------- */
const formatNum = (n: number) => n.toLocaleString()
const formatWeight = (lbs: number) => (lbs >= 2000 ? `${(lbs / 2000).toFixed(1)} tons` : `${formatNum(lbs)} lbs`)
const unique = <T,>(arr: T[]) => Array.from(new Set(arr))

// UTC date helpers to ensure “today” is included reliably
const toKeyDate = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10)
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d))
const addUTCDays = (d: Date, n: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n))

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
  for (let i = n - 1; i >= 0; i--) {
    const d = addUTCDays(end, -i)
    out.push(toKeyDate(d))
  }
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
  const byDate = groupBy(lifts, l => l.date)
  return dates.map(date => {
    const day = byDate.get(date) ?? []
    const volume = day.reduce((sum: number, l: GymLift) => sum + l.weight * l.reps, 0)
    return { date, volume, lifts: day }
  })
}

/* -------------------------- shared pager -------------------------- */
function Pager({
  page,
  totalPages,
  onPrev,
  onNext,
  className = '',
}: {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  className?: string
}) {
  return (
    <div className={`grid grid-cols-3 items-center ${className}`}>
      <div className="justify-self-start">
        <button
          disabled={page <= 1}
          onClick={onPrev}
          className="text-xs text-gray-300 disabled:text-gray-600 hover:underline"
        >
          ← Prev
        </button>
      </div>
      <div className="justify-self-center text-xs text-gray-400">
        Page {page} / {Math.max(1, totalPages)}
      </div>
      <div className="justify-self-end">
        <button
          disabled={page >= totalPages}
          onClick={onNext}
          className="text-xs text-gray-300 disabled:text-gray-600 hover:underline"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

/* -------------------------- component -------------------------- */
export default function DashboardClient({ lifts }: { lifts: GymLift[] }) {
  // default to WEEK
  const [mode, setMode] = useState<RangeMode>('week')

  // years present in data (desc), capped by current year
  const allYears = useMemo(
    () => unique(lifts.map(l => new Date(l.date).getUTCFullYear())).sort((a, b) => b - a),
    [lifts]
  )
  const currentYear = new Date().getUTCFullYear()
  const initialYear = Math.min(currentYear, allYears[0] ?? currentYear)
  const [year, setYear] = useState<number>(initialYear)

  const now = new Date()

  // Year is YTD for current year, full year for past years — UTC-safe
  const dateWindow = useMemo<string[]>(() => {
    if (mode === 'week') return lastNDatesUTC(7, now)
    if (mode === 'month') return lastNDatesUTC(30, now)
    return yearDatesYTDUTC(year)
  }, [mode, year])

  // cap year at current year
  const decYear = () => setYear(y => Math.max(1970, Math.min(currentYear, y - 1)))
  const incYear = () => setYear(y => Math.max(1970, Math.min(currentYear, y + 1)))

  // Filtered lifts in current window
  const filtered = useMemo<GymLift[]>(() => {
    const setDates = new Set(dateWindow)
    return lifts.filter(l => setDates.has(l.date))
  }, [lifts, dateWindow])

  const hasData = filtered.length > 0

  // Last modified
  const lastModified = useMemo(() => {
    if (!lifts.length) return null
    const ts = Math.max(...lifts.map(l => new Date(l.timestamp).getTime()))
    return new Date(ts)
  }, [lifts])

  // Metrics
  const daily = useMemo(() => calcDailyVolume(filtered, dateWindow), [filtered, dateWindow])
  const totalVolume = useMemo(() => daily.reduce((s: number, d) => s + d.volume, 0), [daily])

  const gymDaysCount = useMemo(() => unique(filtered.map(l => l.date)).length, [filtered])
  const exerciseVariety = useMemo(() => unique(filtered.map(l => l.exercise)).length, [filtered])

  const topMover = useMemo(() => {
    const byEx = groupBy(filtered, l => l.exercise)
    let top = { exercise: '—', volume: 0 }
    for (const [exercise, arr] of Array.from(byEx.entries())) {
      const v = arr.reduce((s: number, l: GymLift) => s + l.weight * l.reps, 0)
      if (v > top.volume) top = { exercise, volume: v }
    }
    return top
  }, [filtered])

  // PRs table rows
  const prsAll = useMemo(() => {
    const byEx = groupBy(filtered, l => l.exercise)
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

  // PRs sorting + pagination
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
      // bestSetDate
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

  // Recent sessions (paginated, click → modal)
  const recentSessionsAll = useMemo(() => {
    const byDate = groupBy(filtered, l => l.date)
    const recentDates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : -1))
    return recentDates.map(date => {
      const day = byDate.get(date) || []
      const volume = day.reduce((s: number, l: GymLift) => s + l.weight * l.reps, 0)
      const exercises = unique(day.map(l => l.exercise))
      const sets = day.length
      return { date, volume, exercises, sets, lifts: day }
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

  const [openDay, setOpenDay] = useState<null | { date: string; lifts: GymLift[] }>(null)

  // --- Download Modal state ---
  const [showDownload, setShowDownload] = useState(false)
  const [dlRange, setDlRange] = useState<'current' | 'all' | 'custom'>('current')
  const [dlFormat, setDlFormat] = useState<'json' | 'csv'>('json')
  const datasetMinDate = useMemo(() => (lifts.length ? lifts.reduce((m, l) => (l.date < m ? l.date : m), lifts[0].date) : ''), [lifts])
  const datasetMaxDate = useMemo(() => (lifts.length ? lifts.reduce((m, l) => (l.date > m ? l.date : m), lifts[0].date) : ''), [lifts])
  const [dlFrom, setDlFrom] = useState<string>(datasetMinDate)
  const [dlTo, setDlTo] = useState<string>(datasetMaxDate)

  // Build URL based on modal selections
  const buildDownloadUrl = () => {
    const base = dlFormat === 'json' ? '/api/gym-data' : '/api/gym-data.csv'
    let from = ''
    let to = ''
    if (dlRange === 'current') {
      from = dateWindow[0]
      to = dateWindow[dateWindow.length - 1]
    } else if (dlRange === 'all') {
      from = datasetMinDate
      to = datasetMaxDate
    } else {
      from = dlFrom
      to = dlTo
    }
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const url = qs.toString() ? `${base}?${qs.toString()}` : base
    return url
  }

  // Heatmap label: “Not Available” when no lifts on that day
  const labelForDay = (hasLifts: boolean): string | undefined => (hasLifts ? undefined : 'Not Available')

  return (
    <div className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Top bar: filters (left) + right column (Download above Last modified) */}
        <div className="flex items-start justify-between">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg overflow-hidden border border-gray-700">
              <button
                className={`px-3 py-2 text-sm ${mode === 'week' ? 'bg-blue-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                onClick={() => setMode('week')}
              >
                Week
              </button>
              <button
                className={`px-3 py-2 text-sm ${mode === 'month' ? 'bg-blue-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                onClick={() => setMode('month')}
              >
                Month
              </button>
              <button
                className={`px-3 py-2 text-sm ${mode === 'year' ? 'bg-blue-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                onClick={() => setMode('year')}
              >
                Year (YTD)
              </button>
            </div>

            {mode === 'year' && (
              <div className="flex items-center gap-2 ml-2">
                <button
                  className="px-2 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-700"
                  onClick={decYear}
                  aria-label="Previous Year"
                >
                  ◀
                </button>
                <div className="min-w-[72px] text-center text-sm text-gray-300">{year}</div>
                <button
                  className="px-2 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-700 disabled:opacity-40"
                  onClick={incYear}
                  aria-label="Next Year"
                  disabled={year >= currentYear}
                >
                  ▶
                </button>
              </div>
            )}
          </div>

          {/* Right column: Download button above Last modified (centered pyramid) */}
          <div className="flex flex-col items-end">
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  setDlRange('current')
                  setDlFormat('json')
                  setDlFrom(datasetMinDate)
                  setDlTo(datasetMaxDate)
                  setShowDownload(true)
                }}
                className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md"
              >
                ⬇️ Download Data
              </button>
              <div className="text-xs italic text-gray-400 mt-1">
                {lastModified ? `Last modified: ${lastModified.toLocaleString()}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* tiny gap below filters */}
        <div className="h-2" />

        {!hasData ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <p className="text-gray-300">No data in this range.</p>
          </div>
        ) : (
          <>
            {/* KPIs — content centered */}
            <section className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                  <div className="text-sm text-gray-400">Total Volume</div>
                  <div className="text-2xl font-semibold mt-2">{formatNum(totalVolume)} lbs</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                  <div className="text-sm text-gray-400">Gym Days</div>
                  <div className="text-2xl font-semibold mt-2">
                    {unique(filtered.map(l => l.date)).length}/{dateWindow.length}
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                  <div className="text-sm text-gray-400">Top Mover</div>
                  <div className="text-2xl font-semibold mt-2">{topMover.exercise}</div>
                  <div className="text-xs text-gray-500 mt-1">{formatWeight(topMover.volume)} moved</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
                  <div className="text-sm text-gray-400">Exercise Variety</div>
                  <div className="text-2xl font-semibold mt-2">{exerciseVariety}</div>
                </div>
              </div>
            </section>

            {/* Daily volume chart */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Daily Volume</h2>
              </div>
              <VolumeChart
                data={daily.map((d): { date: string; volume: number } => ({
                  date: d.date,
                  volume: d.volume, // 0 for NA — keeps continuity
                }))}
              />
            </section>

            {/* PRs + Heatmap */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* PRs */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4">Exercise PRs</h2>
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
                          <td className="py-2 pr-4">{row.bestSetDate}</td>
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

              {/* Heatmap — fixed box; year wraps to preserve readability */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4">Volume Heatmap</h2>
                <Heatmap
                  mode={mode}
                  data={daily.map(d => ({
                    date: d.date,
                    volume: d.volume,
                    label: d.lifts.length > 0 ? undefined : 'Not Available',
                  }))}
                  naColor="#3b4351"
                />
              </div>
            </section>

            {/* Recent sessions — paginated; click opens modal */}
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
                  <button
                    key={s.date}
                    onClick={() => setOpenDay({ date: s.date, lifts: s.lifts })}
                    className="text-left bg-gray-800/60 hover:bg-gray-800 transition-colors rounded-lg px-4 py-4 border border-gray-700/60 hover:border-gray-600 group"
                    title="View session details"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold tracking-wide">{s.date}</div>
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
                      Click to view details
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Session modal */}
      {openDay && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">Session Details — {openDay.date}</h3>
              <button onClick={() => setOpenDay(null)} className="text-gray-400 hover:text-gray-200" aria-label="Close">
                ✕
              </button>
            </div>
            <div className="p-5 overflow-x-auto">
              {openDay.lifts.length === 0 ? (
                <div className="text-gray-400 italic">Not Available</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="py-2 pr-4">Exercise</th>
                      <th className="py-2 pr-4">Set</th>
                      <th className="py-2 pr-4">Weight (lbs)</th>
                      <th className="py-2 pr-4">Reps</th>
                      <th className="py-2 pr-4">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...openDay.lifts]
                      .sort((a, b) => (a.exercise === b.exercise ? a.setNumber - b.setNumber : a.exercise.localeCompare(b.exercise)))
                      .map((r) => (
                        <tr key={r.id} className="border-b border-gray-800/60">
                          <td className="py-2 pr-4">{r.exercise}</td>
                          <td className="py-2 pr-4">{r.setNumber}</td>
                          <td className="py-2 pr-4">{r.weight}</td>
                          <td className="py-2 pr-4">{r.reps}</td>
                          <td className="py-2 pr-4">{(r.weight * r.reps).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-800 flex justify-end">
              <button onClick={() => setOpenDay(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              {/* Range */}
              <div>
                <div className="text-gray-300 mb-2">Range</div>
                <div className="grid grid-cols-3 gap-2">
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
                  <button
                    className={`px-3 py-2 rounded-lg border ${dlRange === 'custom' ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-750'}`}
                    onClick={() => setDlRange('custom')}
                  >
                    Custom
                  </button>
                </div>

                {dlRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <div className="text-gray-400 mb-1">From</div>
                      <input
                        type="date"
                        value={dlFrom}
                        onChange={(e) => setDlFrom(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">To</div>
                      <input
                        type="date"
                        value={dlTo}
                        onChange={(e) => setDlTo(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Format */}
              <div>
                <div className="text-gray-300 mb-2">Format</div>
                <div className="inline-flex rounded-lg overflow-hidden border border-gray-700">
                  <button
                    className={`px-4 py-2 text-sm ${dlFormat === 'json' ? 'bg-blue-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                    onClick={() => setDlFormat('json')}
                  >
                    JSON
                  </button>
                  <button
                    className={`px-4 py-2 text-sm ${dlFormat === 'csv' ? 'bg-blue-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                    onClick={() => setDlFormat('csv')}
                  >
                    CSV
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
