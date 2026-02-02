// app/demos/gym-dashboard/form/page.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

// Prevent background scroll when any modal is open (mobile fix)
function useLockBody(locked: boolean) {
  // lock <html> not just <body> for iOS Safari reliability
  useEffect(() => {
    const el = document.documentElement
    const prev = el.style.overflow
    if (locked) el.style.overflow = 'hidden'
    return () => { el.style.overflow = prev }
  }, [locked])
}
import {
  addGymLift,
  getGymLifts,
  deleteGymLift,
  updateGymLift,
  getDayTags,
  getDayTagForDate,
  setDayTagForDate,
  getBodyPartsForDate,
  setBodyPartsForDate,
  getBootstrapData,
  verifyLiftPassword,
  type GymLift
} from './actions'

import {
  listExercises,
  upsertExercise,
  softDeleteExercise,
  type BodyPartKey,
  type Exercise,
} from '../catalog'

type BodyPart =
  | 'biceps' | 'chest' | 'shoulders' | 'back' | 'triceps'
  | 'quads' | 'hamstrings' | 'forearms' | 'core'
  | 'glutes' | 'calves' | 'hips'

const ALL_BODY_PARTS: BodyPart[] = [
  'biceps','chest','shoulders','back','triceps',
  'quads','hamstrings','forearms','core',
  'glutes','calves','hips'
]

// Equipment options (single-select, required)
const EQUIPMENT_OPTIONS = [
  'Smith Machine',
  'Cable Stack',
  'Machine',
  'Dumbbells',
  'Curl Bar',
  'Barbell',
] as const
type Equipment = typeof EQUIPMENT_OPTIONS[number]



// DayTag → default body parts
const DAYTAG_DEFAULTS: Record<string, BodyPart[]> = {
  'push day': ['chest','biceps','shoulders'],
  'pull day': ['back','triceps','core'],
  'leg day':  ['quads','hamstrings','hips','glutes','calves'],
}

export default function GymEntryForm() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')

  const todayISO = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    date: todayISO,
    exercise: '',
    weight: '',
    reps: '',
    dayTag: '',
    isUnilateral: false,
    equipment: '' as '' | Equipment,
  })

  // DB-backed exercise options (filtered + all)
  const [exerciseRows, setExerciseRows] = useState<Exercise[]>([]) // filtered rows (for selected parts)

  // Global list used by Edit modal + manager “All” tab
  const [allExRows, setAllExRows] = useState<Exercise[]>([])

  // Manage modal
  const [showManageEx, setShowManageEx] = useState(false)
  const [mgrTab, setMgrTab] = useState<'filtered' | 'all'>('filtered')
  const [mgrBusyId, setMgrBusyId] = useState<string | null>(null)


  
  // DB-backed exercise options for the selected body parts
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([])

  // Full list used by the Edit modal dropdown
  const [allExOptions, setAllExOptions] = useState<string[]>([])

  // Add-exercise modal state
  const [showAddEx, setShowAddEx] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [newExBP, setNewExBP] = useState<BodyPart>('chest')
  const [newExAliases, setNewExAliases] = useState('')
  const [addExBusy, setAddExBusy] = useState(false)

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [allLifts, setAllLifts] = useState<GymLift[]>([])
  const [editingLift, setEditingLift] = useState<GymLift | null>(null)

  // Menus (mobile-friendly sheets)
  const [showDayInfo, setShowDayInfo] = useState(false)
  const [showBodyParts, setShowBodyParts] = useState(false)
  // Lock body scroll while any sheet/modal is open (moved below declarations to satisfy TS)
  useLockBody(showManageEx || showAddEx || showDayInfo || showBodyParts)

  // First-run flow controller (Day Info → Body Parts)
  const [flowPending, setFlowPending] = useState(false)

  // Body part selection
  const [selectedBodyParts, setSelectedBodyParts] = useState<BodyPart[]>([])

  const [existingDayTags, setExistingDayTags] = useState<string[]>([])
  const defaultDayTags = useMemo(() => ['Push Day', 'Pull Day', 'Leg Day'], [])
  const dayTagSuggestions = useMemo(
    () => Array.from(new Set([...defaultDayTags, ...existingDayTags])).sort((a, b) => a.localeCompare(b)),
    [defaultDayTags, existingDayTags]
  )

  // Avoid reapplying defaults repeatedly
  const lastAppliedDayTagRef = useRef<string>('')
  // Avoid re-fetching DayInfo immediately after bootstrap
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('gymAuth') === 'true') {
      setIsAuthenticated(true)
      bootstrap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function bootstrap() {
    try {
      const { lifts, tags, dayTag, bodyParts, allExercises } = await getBootstrapData(formData.date)

      // Bulk set state from one server POST
      setAllLifts(lifts)
      setExistingDayTags(tags)
      setFormData(fd => ({ ...fd, dayTag: dayTag ?? '' }))

      // Decide active body parts now so we can also prime exercise options
      let activeParts: BodyPart[] = []
      if (bodyParts && bodyParts.length) {
        activeParts = bodyParts as BodyPart[]
        lastAppliedDayTagRef.current = (dayTag || '').trim().toLowerCase()
      } else {
        const normalized = (dayTag || '').trim().toLowerCase()
        if (normalized && DAYTAG_DEFAULTS[normalized]) {
          activeParts = DAYTAG_DEFAULTS[normalized]
          lastAppliedDayTagRef.current = normalized
        }
      }
      setSelectedBodyParts(activeParts)

      // Global exercise catalog (use for edit dropdown and client-side filtering)
      setAllExRows(allExercises)
      setAllExOptions(allExercises.map(e => e.name))

      // Prime exercise list for current parts (client-side filter)
      const initialRows = allExercises.filter(r =>
        activeParts.length ? activeParts.includes(r.bodyPartKey as BodyPart) : true
      )
      setExerciseRows(initialRows)
      setExerciseOptions(initialRows.map(r => r.name))

      // Mark bootstrap complete so the date-change effect doesn't immediately re-fetch
      bootstrappedRef.current = true

      // First-run workflow: if not seen for this date, open Day Info → Body Parts
      if (typeof window !== 'undefined') {
        const key = `gymFlowSeenForDate:${formData.date}`
        const seen = localStorage.getItem(key)
        if (!seen) {
          setFlowPending(true)
          setShowDayInfo(true)
        }
      }
    } catch (e) {
      console.warn('bootstrap failed:', e)
    }
  }

  // If date changes (via Day Info), refresh its metadata
  useEffect(() => {
    if (!isAuthenticated) return
    if (!bootstrappedRef.current) return
    fetchDayInfoFor(formData.date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, isAuthenticated])

  const fetchAllLifts = async () => {
    try {
      const lifts = await getGymLifts()
      setAllLifts(lifts)
    } catch (error) {
      console.error('Error fetching lifts:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const fetchDayTags = async () => {
    try {
      const tags = await getDayTags()
      setExistingDayTags(tags)
    } catch (e) {
      console.warn('Could not fetch day tags (optional):', e)
    }
  }

  const fetchDayInfoFor = async (date: string) => {
    try {
      const [tag, parts] = await Promise.all([
        getDayTagForDate(date),
        getBodyPartsForDate(date),
      ])
      setFormData(fd => ({ ...fd, dayTag: tag ?? '' }))

      if (parts && parts.length) {
        setSelectedBodyParts(parts as BodyPart[])
        lastAppliedDayTagRef.current = (tag || '').trim().toLowerCase()
      } else {
        const normalized = (tag || '').trim().toLowerCase()
        if (normalized && DAYTAG_DEFAULTS[normalized]) {
          setSelectedBodyParts(DAYTAG_DEFAULTS[normalized])
          lastAppliedDayTagRef.current = normalized
        } else {
          setSelectedBodyParts([])
        }
      }
    } catch { /* noop */ }
  }

  useEffect(() => {
    const normalized = (formData.dayTag || '').trim().toLowerCase()
    const recognized = DAYTAG_DEFAULTS[normalized]
    if (recognized && lastAppliedDayTagRef.current !== normalized) {
      setSelectedBodyParts(recognized)
      lastAppliedDayTagRef.current = normalized
    }
  }, [formData.dayTag])

  // Refresh exercise options whenever selected body parts change (client-side filter)
  useEffect(() => {
    const rows = allExRows.filter(r =>
      selectedBodyParts.includes((r.bodyPartKey as BodyPart))
    )
    setExerciseRows(rows)
    setExerciseOptions(rows.map(r => r.name))
  }, [selectedBodyParts, allExRows])


// If current exercise is no longer available, clear it
useEffect(() => {
  setFormData(fd => {
    if (!fd.exercise) return fd
    return exerciseOptions.includes(fd.exercise) ? fd : { ...fd, exercise: '', weight: '' }
  })
}, [exerciseOptions, setFormData])

  const toggleBodyPart = (bp: BodyPart) => {
    setSelectedBodyParts(curr =>
      curr.includes(bp) ? curr.filter(x => x !== bp) : [...curr, bp]
    )
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      if (!formData.date || !formData.exercise || !formData.weight || !formData.reps || !formData.equipment) {
        throw new Error('Please fill in all required fields')
      }

      // (Server re-sequences; this is just for UX hint)
      const existingSets = allLifts.filter(
        lift => lift.date === formData.date && lift.exercise === formData.exercise
      )
      const nextSetNumber = existingSets.length > 0
        ? Math.max(...existingSets.map(s => s.setNumber)) + 1
        : 1

      await addGymLift({
        date: formData.date,
        exercise: formData.exercise,
        weight: parseFloat(formData.weight),
        reps: parseInt(formData.reps, 10),
        setNumber: nextSetNumber,
        dayTag: (formData.dayTag || '').trim() || null,
        isUnilateral: formData.isUnilateral,
        equipment: formData.equipment,
      })

      setStatus('success')
      setFormData({
        ...formData,
        reps: '', // fast add flow
      })

      await fetchAllLifts()
      await fetchDayTags()
      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving data:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this set?')) return
    try {
      await deleteGymLift(id)
      await fetchAllLifts()
    } catch (error) {
      console.error('Error deleting lift:', error)
      alert('Failed to delete lift. Please try again.')
    }
  }
  const handleEdit = (lift: GymLift) => setEditingLift(lift)
  const handleUpdate = async () => {
    if (!editingLift) return
    try {
      await updateGymLift(editingLift.id, {
        date: editingLift.date,
        exercise: editingLift.exercise,   // relabel → server pushes to end of day (appends)
        weight: editingLift.weight,
        reps: editingLift.reps,
        setNumber: editingLift.setNumber, // normalized on server
        dayTag: editingLift.dayTag ?? null,
        isUnilateral: editingLift.isUnilateral ?? null,
        equipment: editingLift.equipment ?? null,
      })
      setEditingLift(null)
      await fetchAllLifts()
      await fetchDayTags()
    } catch (error) {
      console.error('Error updating lift:', error)
      alert('Failed to update lift. Please try again.')
    }
  }

  // ---- Derivations for selected date ----
  const liftsForSelectedDate = useMemo(
    () => allLifts
      .filter(l => l.date === formData.date)
      .sort((a, b) => {
        const ta = Date.parse(a.timestamp)
        const tb = Date.parse(b.timestamp)
        if (ta === tb) return a.id.localeCompare(b.id)
        return ta - tb
      }),
    [allLifts, formData.date]
  )

  // Group sets by exercise (single group per exercise)
  const liftsByExerciseForSelectedDate = useMemo(() => {
    const acc: Record<string, GymLift[]> = {}
    for (const lift of liftsForSelectedDate) {
      (acc[lift.exercise] ||= []).push(lift)
    }
    return acc
  }, [liftsForSelectedDate])

  // Sets in each exercise: chronological; groups: newest latest-set first (so revisiting floats to top)
  const exerciseGroupsChrono = useMemo(() => {
    return Object.entries(liftsByExerciseForSelectedDate)
      .map(([exercise, sets]) => {
        const setsChrono = [...sets].sort((a, b) => {
          const ta = Date.parse(a.timestamp)
          const tb = Date.parse(b.timestamp)
          if (ta === tb) return a.id.localeCompare(b.id)
          return ta - tb
        })
        const latestTs = Date.parse(setsChrono[setsChrono.length - 1]?.timestamp ?? '')
        const exerciseVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
        return { exercise, sets: setsChrono, latestTs, exerciseVolume }
      })
      .sort((a, b) => b.latestTs - a.latestTs) // newest group on top
  }, [liftsByExerciseForSelectedDate])

  const totalVolumeForSelectedDate = liftsForSelectedDate.reduce((sum, lift) => sum + (lift.weight * lift.reps), 0)
  const dayTagForSelectedDate = (formData.dayTag || '').trim()

  const Sheet = ({
    open, onClose, title, children
  }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    if (!open) return null
    return (
      <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" aria-label={title}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[420px] bg-black/95 border-t md:border-l border-white/20 rounded-t-2xl md:rounded-l-2xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="px-2 py-1 text-white/60 hover:text-white rounded transition-colors"
              aria-label="Close"
            >
              Close
            </button>
          </div>
          <div className="p-4 max-h-[70vh] md:max-h-[100vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    )
  }

  // --------- Custom onClose handlers to implement the Day Info → Body Parts flow ----------
  const handleCloseDayInfo = () => {
    setShowDayInfo(false)
    if (flowPending) {
      setTimeout(() => setShowBodyParts(true), 60)
    }
  }
  const handleCloseBodyParts = () => {
    setShowBodyParts(false)
    if (flowPending && typeof window !== 'undefined') {
      const key = `gymFlowSeenForDate:${formData.date}`
      localStorage.setItem(key, '1')
      setFlowPending(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-white/[0.02] rounded-xl border border-white/10 p-8 max-w-md w-full text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-6">Gym Tracker Access</h1>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const ok = await verifyLiftPassword(password)
                if (ok) {
                  setIsAuthenticated(true)
                  localStorage.setItem('gymAuth', 'true')
                  bootstrap()
                } else {
                  alert('Incorrect password')
                  setPassword('')
                }
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 mb-4 transition-all"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-[#54b3d6] hover:bg-[#6dc5e8] text-black font-medium py-3 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(84,179,214,0.3)]"
              >
                Access Tracker
              </button>
            </form>
            <p className="text-white/40 text-xs mt-4">This page is password protected</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        {/* Title */}
        <div className="mb-6 w-full">
          <h1 className="text-3xl font-bold text-white text-center tracking-tight">Gym Tracker</h1>
          <p className="text-center text-white/40 text-sm mt-2">Track your lifts with precision</p>
        </div>

        {/* Top buttons — two clear groups with divider; mobile-friendly */}
        <div className="w-full mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
            {/* Group A: Day Info / Body Parts */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setShowDayInfo(true)}
                className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] text-white rounded-lg border border-white/10 hover:border-[#54b3d6]/30 text-sm transition-all"
              >
                Day Info
              </button>
              <button
                onClick={() => setShowBodyParts(true)}
                className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] text-white rounded-lg border border-white/10 hover:border-[#54b3d6]/30 text-sm transition-all"
              >
                Body Parts
              </button>
            </div>

            {/* Divider: horizontal on mobile, vertical on desktop */}
            <div className="my-2 md:my-0">
              <div className="block md:hidden h-px w-full bg-white/10" />
              <div className="hidden md:block w-px h-8 bg-white/10 mx-2" />
            </div>

            {/* Group B: View Dashboard / Logout */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href="/demos/gym-dashboard"
                className="px-4 py-2 bg-[#54b3d6] text-black rounded-lg hover:bg-[#6dc5e8] transition-all text-sm text-center font-medium"
              >
                View Dashboard
              </a>
              <button
                onClick={() => {
                  localStorage.removeItem('gymAuth')
                  setIsAuthenticated(false)
                }}
                className="px-4 py-2 bg-white/[0.03] text-white/60 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-white/10 transition-all text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {status === 'success' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 w-full text-center backdrop-blur-sm">
            <p className="text-green-400">Set saved. Add another or change exercise.</p>
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 w-full text-center backdrop-blur-sm">
            <p className="text-red-400">Error saving data. Check your setup and console logs.</p>
          </div>
        )}

        {/* ===================== Add New Set (centered card) ===================== */}
        <form onSubmit={handleSubmit} className="bg-white/[0.02] rounded-xl border border-white/10 p-8 mb-6 w-full text-center flex flex-col items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Title */}
            <h2 className="text-xl font-semibold text-white">Add New Set</h2>

            {/* Date + chip row */}
            <div className="mt-2 text-xs text-white/40 flex items-center justify-center gap-2">
              <span className="text-white/50">Date:</span>
              <span className="text-white/90 font-mono">{formData.date}</span>
              {dayTagForSelectedDate && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#54b3d6]/10 text-[#54b3d6] border border-[#54b3d6]/30 font-medium">
                    {dayTagForSelectedDate}
                  </span>
                </>
              )}
            </div>

            <div className="space-y-6 mt-4 w-full max-w-xl">
              {/* Exercise */}
              <div className="w-full">
                <label className="block text-sm font-medium text-white/60 mb-1 text-center">Exercise *</label>
                {/* Manage button (under the select & count) */}
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMgrTab('filtered')
                      setShowManageEx(true)
                    }}
                    className="text-xs px-2 py-1 rounded bg-white/[0.03] border border-white/10 text-white/90 hover:bg-white/[0.06] hover:border-[#54b3d6]/30 transition-all"
                    title="Manage your exercise catalog"
                  >
                    Manage Exercises
                  </button>
                </div>
              </div>
                <select
                  value={formData.exercise}
                  onChange={(e) => setFormData({ ...formData, exercise: e.target.value, weight: '' })}
                  className="w-full px-4 py-3 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
                  required
                >
                  <option value="">
                    {exerciseOptions.length === 0 ? 'No exercises for current selection' : 'Select exercise'}
                  </option>
                  {exerciseOptions.map(exercise => (
                    <option key={exercise} value={exercise}>{exercise}</option>
                  ))}
                </select>

                {/* Count (separate line) */}
                <div className="text-xs text-white/40 mt-2 text-center">
                  {exerciseOptions.length} available
                </div>

              {/* Equipment (own row, required) */}
              <div className="w-full">
                <label className="block text-sm font-medium text-white/60 mb-1 text-center">Equipment *</label>
                <select
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value as Equipment })}
                  required
                  className="w-full px-4 py-3 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
                >
                  <option value="">Select equipment</option>
                  {EQUIPMENT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Unilateral (own row) */}
              <div className="w-full flex items-center justify-center gap-2">
                <input
                  id="unilateral"
                  type="checkbox"
                  checked={formData.isUnilateral}
                  onChange={(e) => setFormData({ ...formData, isUnilateral: e.target.checked })}
                  className="accent-[#54b3d6]"
                />
                <label htmlFor="unilateral" className="text-sm text-white/60">
                  Unilateral set
                </label>
                <span className="text-xs text-white/40">(Flag only)</span>
              </div>

              {/* Weight */}
              <div className="w-full">
                <label className="block text-sm font-medium text-white/60 mb-2 text-center">Weight (lbs) *</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all font-mono"
                  min="0"
                  max="1500"
                  step="2.5"
                  required
                />
              </div>

              {/* Reps */}
              <div className="w-full">
                <label className="block text-sm font-medium text-white/60 mb-2 text-center">Reps *</label>
                <input
                  type="number"
                  value={formData.reps}
                  onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all font-mono"
                  min="1"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-[#54b3d6] hover:bg-[#6dc5e8] disabled:bg-white/10 disabled:text-white/40 text-black font-semibold py-3 rounded-lg transition-all text-lg hover:shadow-[0_0_20px_rgba(84,179,214,0.3)]"
              >
                {status === 'submitting' ? 'Saving…' : 'Add Set'}
              </button>
            </div>
          </div>
        </form>

        {/* ===================== Workout History (newest exercise group first) ===================== */}
        <div className="bg-white/[0.02] rounded-xl border border-white/10 p-6 w-full">
          {/* Centered header + subheader */}
          <h3 className="text-lg font-semibold text-white mb-2 text-center">
            Workout History for <span className="font-mono text-[#54b3d6]">{formData.date}</span>
          </h3>
          <div className="flex flex-col items-center justify-center mb-4">
            <div className="flex items-center gap-2">
              {dayTagForSelectedDate && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#54b3d6]/10 text-[#54b3d6] border border-[#54b3d6]/30 font-medium">
                  {dayTagForSelectedDate}
                </span>
              )}
              <span className="text-white/40 text-sm">
                {Object.keys(liftsByExerciseForSelectedDate).length} exercise
                {Object.keys(liftsByExerciseForSelectedDate).length !== 1 ? 's' : ''} ·{' '}
                <span className="font-mono text-white/60">{totalVolumeForSelectedDate.toLocaleString()}</span> lbs total
              </span>
            </div>
          </div>

          {liftsForSelectedDate.length === 0 ? (
            <p className="text-white/40 text-sm text-center">No sets yet for this date.</p>
          ) : (
            <div className="space-y-3">
              {exerciseGroupsChrono.map(({ exercise, sets, exerciseVolume }) => (
                <div key={exercise} className="bg-white/[0.03] rounded-lg p-3 border border-white/10 hover:border-[#54b3d6]/30 transition-all group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">{exercise}</span>
                    <span className="text-white/40 text-sm font-mono">{exerciseVolume.toLocaleString()} lbs</span>
                  </div>
                  <div className="space-y-1">
                    {sets.map((set) => (
                      <div
                        key={set.id}
                        className="flex justify-between items-center text-sm bg-white/[0.02] rounded px-3 py-2 border border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 font-mono">
                            Set {set.setNumber}: <span className="text-white/90">{set.weight} lbs × {set.reps} reps</span>
                          </span>
                          {set.equipment ? (
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/60 border border-white/10">
                              {set.equipment}
                            </span>
                          ) : null}
                          {set.isUnilateral ? (
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-[#54b3d6]/10 text-[#54b3d6] border border-[#54b3d6]/30 uppercase tracking-wide font-semibold">
                              UNI
                            </span>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingLift(set)}
                            className="text-[#54b3d6] hover:text-[#6dc5e8] transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(set.id)}
                            className="text-red-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Day Info Sheet ===== */}
      <Sheet open={showDayInfo} onClose={handleCloseDayInfo} title="Day Information">
        <form
        onSubmit={async (e) => {
          e.preventDefault()
          const raw = (formData.dayTag || '').trim()
          const tag = raw.length ? raw : null

          try {
            // Critical write
            await setDayTagForDate(formData.date, tag)

            // Best-effort refreshes
            try { await fetchAllLifts() } catch {}
            try { await fetchDayTags() } catch {}

            // Apply defaults locally if recognized
            const normalized = (tag || '').toLowerCase()
            if (normalized && DAYTAG_DEFAULTS[normalized]) {
              setSelectedBodyParts(DAYTAG_DEFAULTS[normalized])
              lastAppliedDayTagRef.current = normalized
            }

            handleCloseDayInfo()
          } catch (err) {
            console.error('Failed to save day info:', err)
            handleCloseDayInfo()
          }
        }}
        className="space-y-4"
      >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Workout Day (optional)</label>

            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {defaultDayTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData(fd => ({ ...fd, dayTag: t }))}
                  className={[
                    'px-3 py-1.5 rounded-lg border text-sm transition-all',
                    (formData.dayTag.trim().toLowerCase() === t.toLowerCase())
                      ? 'bg-[#54b3d6]/10 border-[#54b3d6]/30 text-[#54b3d6]'
                      : 'bg-white/[0.02] border-white/10 text-white/90 hover:bg-white/[0.05] hover:border-white/20'
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#54b3d6] hover:bg-[#6dc5e8] text-black font-semibold py-2.5 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(84,179,214,0.3)]"
            >
              Save
            </button>
          </div>
        </form>
      </Sheet>

      {/* ===== Body Parts Sheet ===== */}
      <Sheet open={showBodyParts} onClose={handleCloseBodyParts} title="Target Body Parts">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-white/60">Check the muscle groups you're targeting today.</div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-xs bg-white/[0.03] border border-white/10 rounded hover:bg-white/[0.06] hover:border-[#54b3d6]/30 text-white/90 transition-all"
              onClick={() => setSelectedBodyParts(ALL_BODY_PARTS)}
              title="Select all"
            >
              Select All
            </button>
            <button
              className="px-3 py-1 text-xs bg-white/[0.03] border border-white/10 rounded hover:bg-white/[0.06] hover:border-[#54b3d6]/30 text-white/90 transition-all"
              onClick={() => setSelectedBodyParts([])}
              title="Clear selection"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ALL_BODY_PARTS.map(bp => {
            const active = selectedBodyParts.includes(bp)
            return (
              <button
                key={bp}
                type="button"
                onClick={() => toggleBodyPart(bp)}
                className={[
                  'flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all',
                  active
                    ? 'bg-[#54b3d6]/10 border-[#54b3d6]/30 text-[#54b3d6]'
                    : 'bg-white/[0.02] border-white/10 text-white/90 hover:bg-white/[0.05] hover:border-white/20'
                ].join(' ')}
              >
                <span className="capitalize">{bp}</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleBodyPart(bp)}
                  className="accent-[#54b3d6]"
                  aria-label={`Toggle ${bp}`}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
            )
          })}
        </div>

        <div className="pt-4 space-y-2">
          <button
            className="w-full bg-[#54b3d6] hover:bg-[#6dc5e8] text-black font-semibold py-2.5 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(84,179,214,0.3)]"
            onClick={async () => {
              try {
                await setBodyPartsForDate(formData.date, selectedBodyParts)
                handleCloseBodyParts()
              } catch (e) {
                console.error('Failed to save body parts:', e)
                alert('Failed to save body parts. Try again.')
              }
            }}
          >
            Save Body Parts
          </button>
          <button
            className="w-full bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/10 hover:border-white/20 font-medium py-2.5 rounded-lg transition-all"
            onClick={handleCloseBodyParts}
          >
            Done
          </button>
        </div>
      </Sheet>

      {showAddEx && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/95 border border-white/20 rounded-xl max-w-md w-full backdrop-blur-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-lg font-semibold">Add Exercise</h3>
              <button onClick={() => setShowAddEx(false)} className="text-white/60 hover:text-white transition-colors" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Name *</label>
                <input
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
                  placeholder="e.g., Cable Fly"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Body Part *</label>
                <select
                  value={newExBP}
                  onChange={(e) => setNewExBP(e.target.value as BodyPart)}
                  className="w-full px-3 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
                >
                  {ALL_BODY_PARTS.map(bp => (
                    <option key={bp} value={bp}>{bp.charAt(0).toUpperCase() + bp.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Aliases (comma-separated)</label>
                <input
                  value={newExAliases}
                  onChange={(e) => setNewExAliases(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
                  placeholder="RDL, Pull Up…"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => setShowAddEx(false)}
                className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                disabled={addExBusy || !newExName.trim()}
                onClick={async () => {
                  try {
                    setAddExBusy(true)
                    await upsertExercise({
                      name: newExName.trim(),
                      bodyPartKey: newExBP as BodyPartKey,
                      aliases: newExAliases.split(',').map(s => s.trim()).filter(Boolean),
                    })
                    // refresh lists
                    try {
                      const all = await listExercises()
                      setAllExRows(all)
                      setAllExOptions(all.map(e => e.name))
                      const rows = all.filter(r => selectedBodyParts.includes((r.bodyPartKey as BodyPart)))
                      setExerciseRows(rows)
                      setExerciseOptions(rows.map(r => r.name))
                    } catch {}
                    setFormData(fd => ({ ...fd, exercise: newExName.trim(), weight: '' }))
                    setShowAddEx(false)
                  } finally {
                    setAddExBusy(false)
                  }
                }}
                className="px-4 py-2 bg-[#54b3d6] hover:bg-[#6dc5e8] rounded-lg disabled:bg-white/10 disabled:text-white/40 transition-all hover:shadow-[0_0_20px_rgba(84,179,214,0.3)] text-black font-semibold"
              >
                {addExBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageEx && (
  <div className="fixed inset-0 z-50">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowManageEx(false)} />

    {/* Modal frame: full height on mobile, ~90vh on desktop */}
    <div className="absolute inset-0 flex items-stretch justify-center">
      <div
        className={[
          'bg-black/95 border border-white/20 w-full h-full backdrop-blur-sm',
          'sm:h-[90vh] sm:my-6 sm:max-w-3xl sm:rounded-xl',
          'flex flex-col'
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Manage Exercises"
      >
        {/* Header (fixed) */}
        <div className="shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Manage Exercises</h3>
          <button
            onClick={() => setShowManageEx(false)}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content wrapper (ensures modal scrolls, page behind doesn't) */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-5 py-4 w-full max-w-2xl mx-auto">
            {/* ===== Add New Exercise (moved to top) ===== */}
            <div className="mb-6">
              <div className="text-sm text-white/60 mb-2">Add a new exercise to your catalog.</div>
              <AddExerciseInline
                allParts={ALL_BODY_PARTS}
                onAdd={async ({ name, bodyPartKey }) => {
                  await upsertExercise({ name: name.trim(), bodyPartKey: bodyPartKey as BodyPartKey, isActive: true })
                  try {
                    const all = await listExercises()
                    setAllExRows(all)
                    setAllExOptions(all.map(e => e.name))
                    const filtered = all.filter(r => selectedBodyParts.includes((r.bodyPartKey as BodyPart)))
                    setExerciseRows(filtered)
                    setExerciseOptions(filtered.map(r => r.name))
                  } catch {}
                }}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-6" />

            {/* ===== Modify Existing Exercises ===== */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">Modify Existing Exercises</div>
                <div className="text-xs text-white/60">Edit names or body parts.</div>
              </div>
              {/* Tabs */}
              <div className="inline-flex rounded-lg overflow-hidden border border-white/10">
                <button
                  className={`px-3 py-1.5 text-sm transition-all ${mgrTab === 'filtered' ? 'bg-[#54b3d6] text-black font-semibold' : 'bg-white/[0.02] hover:bg-white/[0.05] text-white/90'}`}
                  onClick={() => setMgrTab('filtered')}
                >
                  Filtered ({exerciseRows.length})
                </button>
                <button
                  className={`px-3 py-1.5 text-sm transition-all ${mgrTab === 'all' ? 'bg-[#54b3d6] text-black font-semibold' : 'bg-white/[0.02] hover:bg-white/[0.05] text-white/90'}`}
                  onClick={() => setMgrTab('all')}
                >
                  All ({allExRows.length})
                </button>
              </div>
            </div>

            {/* Responsive list (same width as Add section) */}
            <div className="space-y-3">
              {(mgrTab === 'filtered' ? exerciseRows : allExRows).map((row) => (
                <ManageExerciseRow
                  key={row.id}
                  row={row}
                  allParts={ALL_BODY_PARTS}
                  onSave={async (updated) => {
                    try {
                      setMgrBusyId(row.id)
                      await upsertExercise({
                        id: row.id,
                        name: updated.name.trim(),
                        bodyPartKey: updated.bodyPartKey as BodyPartKey,
                        isActive: true,
                      })
                      // refresh lists
                      try {
                        const all = await listExercises()
                        setAllExRows(all)
                        setAllExOptions(all.map(e => e.name))
                        const filtered = all.filter(r => selectedBodyParts.includes((r.bodyPartKey as BodyPart)))
                        setExerciseRows(filtered)
                        setExerciseOptions(filtered.map(r => r.name))
                      } catch {}
                      setFormData(fd => {
                        if (fd.exercise && fd.exercise === row.name && updated.name.trim() !== row.name) {
                          return { ...fd, exercise: updated.name.trim(), weight: '' }
                        }
                        return fd
                      })
                    } finally {
                      setMgrBusyId(null)
                    }
                  }}
                  onDelete={async () => {
                    if (!confirm(`Delete "${row.name}"? This will hide it from all dropdowns.`)) return
                    try {
                      setMgrBusyId(row.id)
                      await softDeleteExercise(row.id)
                      // refresh lists
                      try {
                        const all = await listExercises()
                        setAllExRows(all)
                        setAllExOptions(all.map(e => e.name))
                        const filtered = all.filter(r => selectedBodyParts.includes((r.bodyPartKey as BodyPart)))
                        setExerciseRows(filtered)
                        setExerciseOptions(filtered.map(r => r.name))
                      } catch {}
                      setFormData(fd => (fd.exercise === row.name ? { ...fd, exercise: '', weight: '' } : fd))
                    } finally {
                      setMgrBusyId(null)
                    }
                  }}
                  busy={mgrBusyId === row.id}
                />
              ))}

              {((mgrTab === 'filtered' ? exerciseRows : allExRows).length === 0) && (
                <div className="text-white/40 text-sm">No exercises to show.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer (fixed) */}
        <div className="shrink-0 px-5 py-4 border-t border-white/10 flex justify-end">
          <button
            onClick={() => setShowManageEx(false)}
            className="px-4 py-2 bg-[#54b3d6] hover:bg-[#6dc5e8] text-black font-semibold rounded-lg transition-all hover:shadow-[0_0_20px_rgba(84,179,214,0.3)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
)}



      {/* Edit Modal */}
      {editingLift && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/95 rounded-xl border border-white/20 max-w-md w-full p-6 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white mb-4">Edit Set</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Date</label>
                <input
                  type="date"
                  value={editingLift.date}
                  onChange={(e) => setEditingLift({ ...editingLift, date: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Exercise</label>
                 <select
                  value={editingLift.exercise}
                  onChange={(e) => setEditingLift({ ...editingLift, exercise: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all font-mono"
                >
                  {allExOptions.map(exercise => (
                    <option key={exercise} value={exercise}>{exercise}</option>
                  ))}
                </select>
              </div>

              {/* Equipment (row) */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1">Equipment</label>
                <select
                  value={editingLift.equipment ?? ''}
                  onChange={(e) => setEditingLift({ ...editingLift, equipment: (e.target.value || null) as Equipment | null })}
                  className="w-full px-3 py-2.5 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
                >
                  <option value="">Select equipment</option>
                  {EQUIPMENT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Unilateral (row) */}
              <div className="flex items-center gap-2">
                <input
                  id="edit-unilateral"
                  type="checkbox"
                  checked={!!editingLift.isUnilateral}
                  onChange={(e) => setEditingLift({ ...editingLift, isUnilateral: e.target.checked })}
                  className="accent-[#54b3d6]"
                />
                <label htmlFor="edit-unilateral" className="text-sm text-white/60">
                  Unilateral set
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Weight (lbs)</label>
                  <input
                    type="number"
                    value={editingLift.weight}
                    onChange={(e) => setEditingLift({ ...editingLift, weight: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all font-mono"
                    min="0"
                    max="1500"
                    step="2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Reps</label>
                  <input
                    type="number"
                    value={editingLift.reps}
                    onChange={(e) => setEditingLift({ ...editingLift, reps: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all font-mono"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Set Number</label>
                <input
                  type="number"
                  value={editingLift.setNumber}
                  onChange={(e) => setEditingLift({ ...editingLift, setNumber: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-4 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all font-mono"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Day Tag</label>
                <input
                  type="text"
                  value={editingLift.dayTag ?? ''}
                  onChange={(e) => setEditingLift({ ...editingLift, dayTag: e.target.value })}
                  className="w-full px-4 py-2 bg-white/[0.03] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all font-mono"
                  placeholder="e.g., Push Day"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  inputMode="text"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-[#54b3d6] hover:bg-[#6dc5e8] text-black font-semibold py-2 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(84,179,214,0.3)]"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingLift(null)}
                className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] text-white border border-white/10 hover:border-white/20 py-2 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ManageExerciseRow({
  row,
  allParts,
  onSave,
  onDelete,
  busy,
}: {
  row: Exercise
  allParts: BodyPart[]
  onSave: (updated: { name: string; bodyPartKey: BodyPart }) => Promise<void>
  onDelete: () => Promise<void>
  busy?: boolean
}) {
  const [name, setName] = useState(row.name)
  const [bp, setBp] = useState<BodyPart>((row.bodyPartKey as BodyPart) ?? 'chest')

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:border-[#54b3d6]/30 transition-all">
      {/* Row 1: Exercise | Body Part (on one line) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-white/[0.03] text-white border border-white/10 rounded focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
          placeholder="Exercise name"
        />
        <select
          value={bp}
          onChange={(e) => setBp(e.target.value as BodyPart)}
          className="w-full px-3 py-2 bg-white/[0.03] text-white border border-white/10 rounded focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
        >
          {allParts.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Row 2: Save | Delete */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            disabled={busy || !name.trim()}
            onClick={() => onSave({ name, bodyPartKey: bp })}
            className="px-3 py-1.5 text-sm rounded bg-[#54b3d6] hover:bg-[#6dc5e8] disabled:bg-white/10 disabled:text-white/40 text-black font-semibold transition-all hover:shadow-[0_0_15px_rgba(84,179,214,0.3)]"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            disabled={busy}
            onClick={onDelete}
            className="px-3 py-1.5 text-sm rounded bg-red-500/10 hover:bg-red-500/20 disabled:bg-white/10 disabled:text-white/40 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 transition-all"
          >
            {busy ? '…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddExerciseInline({
  allParts,
  onAdd,
}: {
  allParts: BodyPart[]
  onAdd: (v: { name: string; bodyPartKey: BodyPart }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [bp, setBp] = useState<BodyPart>('chest')
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-lg border border-white/10 p-3 bg-white/[0.02]">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Cable Fly"
          className="px-3 py-2 bg-white/[0.03] text-white border border-white/10 rounded focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
        />
        <select
          value={bp}
          onChange={(e) => setBp(e.target.value as BodyPart)}
          className="px-3 py-2 bg-white/[0.03] text-white border border-white/10 rounded focus:ring-2 focus:ring-[#54b3d6]/50 focus:border-[#54b3d6]/30 transition-all"
        >
          {allParts.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <button
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              await onAdd({ name: name.trim(), bodyPartKey: bp })
              setName('')
              setBp('chest')
            } finally {
              setBusy(false)
            }
          }}
          className="px-3 py-2 bg-[#54b3d6] hover:bg-[#6dc5e8] rounded disabled:bg-white/10 disabled:text-white/40 text-sm text-black font-semibold transition-all hover:shadow-[0_0_15px_rgba(84,179,214,0.3)]"
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>
    </div>
  )
}
