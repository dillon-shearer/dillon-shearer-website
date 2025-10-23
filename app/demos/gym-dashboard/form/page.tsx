'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  type GymLift
} from './actions'

type BodyPart =
  | 'biceps' | 'chest' | 'shoulders' | 'back' | 'triceps'
  | 'quads' | 'hamstrings' | 'forearms' | 'core'
  | 'glutes' | 'calves' | 'hips'

const ALL_BODY_PARTS: BodyPart[] = [
  'biceps','chest','shoulders','back','triceps',
  'quads','hamstrings','forearms','core',
  'glutes','calves','hips'
]

// Dummy catalog (replace later)
const EXERCISES_BY_BODY_PART: Record<BodyPart, string[]> = {
  biceps:     ['Barbell Curl','Dumbbell Curl','Hammer Curl'],
  chest:      ['Bench Press','Incline DB Press','Chest Fly'],
  shoulders:  ['Overhead Press','Lateral Raise','Rear Delt Fly'],
  back:       ['Barbell Row','Pull-ups','Lat Pulldown'],
  triceps:    ['Tricep Pushdown','Skull Crushers','Close-Grip Bench'],
  quads:      ['Back Squat','Front Squat','Leg Press'],
  hamstrings: ['Romanian Deadlift','Leg Curl','Good Morning'],
  forearms:   ['Wrist Curl','Reverse Curl','Farmer’s Carry'],
  core:       ['Hanging Leg Raise','Cable Crunch','Plank'],
  glutes:     ['Hip Thrust','Glute Bridge','Bulgarian Split Squat'],
  calves:     ['Standing Calf Raise','Seated Calf Raise','Donkey Calf Raise'],
  hips:       ['Abduction Machine','Copenhagen Plank','Hip Airplane'],
}

// DayTag → default body parts
const DAYTAG_DEFAULTS: Record<string, BodyPart[]> = {
  'push day': ['chest','biceps','shoulders'],
  'pull day': ['back','triceps','core'],
  'leg day':  ['quads','hamstrings','hips','glutes','calves'],
}

export default function GymEntryForm() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    exercise: '',
    weight: '',
    reps: '',
    dayTag: '',
    isUnilateral: false, // NEW
  })

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [allLifts, setAllLifts] = useState<GymLift[]>([])
  const [editingLift, setEditingLift] = useState<GymLift | null>(null)

  // Menus (mobile-friendly sheets)
  const [showDayInfo, setShowDayInfo] = useState(false)
  const [showBodyParts, setShowBodyParts] = useState(false)

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

  // === Effects & data loading ===
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('gymAuth') === 'true') {
      setIsAuthenticated(true)
      bootstrap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function bootstrap() {
    await Promise.all([fetchAllLifts(), fetchDayTags(), fetchDayInfoFor(formData.date)])
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchDayInfoFor(formData.date)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date])

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

  // On dayTag changes: apply defaults if recognized; else leave selection as-is
  useEffect(() => {
    const normalized = (formData.dayTag || '').trim().toLowerCase()
    const recognized = DAYTAG_DEFAULTS[normalized]
    if (recognized && lastAppliedDayTagRef.current !== normalized) {
      setSelectedBodyParts(recognized)
      lastAppliedDayTagRef.current = normalized
      // Clear exercise if it no longer fits
      setFormData(fd => {
        const filtered = getFilteredExercises(recognized)
        return filtered.includes(fd.exercise) ? fd : { ...fd, exercise: '' }
      })
    }
  }, [formData.dayTag])

  // === Body Part selection ===
  const toggleBodyPart = (bp: BodyPart) => {
    setSelectedBodyParts(curr => {
      const next = curr.includes(bp) ? curr.filter(x => x !== bp) : [...curr, bp]
      setFormData(fd => {
        const filtered = getFilteredExercises(next)
        return filtered.includes(fd.exercise) ? fd : { ...fd, exercise: '' }
      })
      return next
    })
  }

  // === Filtered exercise list ===
  const getFilteredExercises = (parts: BodyPart[] | BodyPart[]): string[] => {
    const set = new Set<string>()
    parts.forEach(p => EXERCISES_BY_BODY_PART[p]?.forEach(ex => set.add(ex)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }
  const filteredExercises = useMemo(
    () => getFilteredExercises(selectedBodyParts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedBodyParts]
  )

  // === Submit new set ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')

    try {
      if (!formData.date || !formData.exercise || !formData.weight || !formData.reps) {
        throw new Error('Please fill in all required fields')
      }

      // Next set number for date+exercise
      const existingSets = allLifts.filter(
        lift => lift.date === formData.date && lift.exercise === formData.exercise
      )
      const nextSetNumber = existingSets.length > 0
        ? Math.max(...existingSets.map(s => s.setNumber)) + 1
        : 1

      await addGymLift({
        date: formData.date,
        exercise: formData.exercise,
        weight: parseInt(formData.weight),
        reps: parseInt(formData.reps),
        setNumber: nextSetNumber,
        dayTag: (formData.dayTag || '').trim() || null,
        isUnilateral: formData.isUnilateral, // NEW
      })

      setStatus('success')
      setFormData({
        ...formData,
        weight: '',
        reps: '',
        // keep exercise & isUnilateral sticky; change if you prefer reset
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

  // === Edit/Delete ===
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
        exercise: editingLift.exercise,
        weight: editingLift.weight,
        reps: editingLift.reps,
        setNumber: editingLift.setNumber,
        dayTag: editingLift.dayTag ?? null,
        isUnilateral: editingLift.isUnilateral ?? null, // NEW
      })
      setEditingLift(null)
      await fetchAllLifts()
      await fetchDayTags()
    } catch (error) {
      console.error('Error updating lift:', error)
      alert('Failed to update lift. Please try again.')
    }
  }

  // === Derived: show only selected date in history ===
  const liftsForSelectedDate = allLifts.filter(l => l.date === formData.date)
  const liftsByExerciseForSelectedDate = liftsForSelectedDate.reduce((acc, lift) => {
    if (!acc[lift.exercise]) acc[lift.exercise] = []
    acc[lift.exercise].push(lift)
    return acc
  }, {} as Record<string, GymLift[]>)
  Object.keys(liftsByExerciseForSelectedDate).forEach(ex => {
    liftsByExerciseForSelectedDate[ex].sort((a, b) => a.setNumber - b.setNumber)
  })
  const totalVolumeForSelectedDate = liftsForSelectedDate.reduce((sum, lift) => sum + (lift.weight * lift.reps), 0)
  const dayTagForSelectedDate = (formData.dayTag || '').trim()

  // ==== Simple Sheet/Modal primitives (accessible, mobile-first) ====
  const Sheet = ({
    open, onClose, title, children
  }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    if (!open) return null
    return (
      <div
        className="fixed inset-0 z-50"
        aria-modal="true"
        role="dialog"
        aria-label={title}
      >
        <div
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
        />
        <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[420px] bg-gray-900 border-t md:border-l border-gray-700 rounded-t-2xl md:rounded-l-2xl shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="text-white font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="px-2 py-1 text-gray-300 hover:text-white rounded"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="p-4 max-h-[70vh] md:max-h-[100vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6">Gym Tracker Access</h1>
          <form onSubmit={(e) => {
            e.preventDefault()
            if (password === 'dillonlifts') {
              setIsAuthenticated(true)
              localStorage.setItem('gymAuth', 'true')
              bootstrap()
            } else {
              alert('Incorrect password')
              setPassword('')
            }
          }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Access Tracker
            </button>
          </form>
          <p className="text-gray-500 text-xs mt-4 text-center">This page is password protected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-2xl mx-auto">
        {/* Title Row (centered) */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-white text-center">Gym Tracker</h1>
        </div>

        {/* Buttons Row: left (menus) | right (view/logout) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDayInfo(true)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 text-sm"
            >
              Day Info
            </button>
            <button
              onClick={() => setShowBodyParts(true)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 text-sm"
            >
              Body Parts
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/demos/gym-dashboard"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm text-center"
            >
              View Dashboard
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('gymAuth')
                setIsAuthenticated(false)
              }}
              className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {status === 'success' && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-400">✅ Set saved! Add another or change exercise.</p>
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-400">❌ Error saving data. Check your setup and console logs.</p>
          </div>
        )}

        {/* ===================== Add New Set (Primary) ===================== */}
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-700 p-8 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-white">Add New Set</h2>
            <div className="text-xs text-gray-400">
              <span className="text-gray-500">Date:</span>{' '}
              <span className="text-gray-200">{formData.date}</span>
              {dayTagForSelectedDate ? (
                <> · <span className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-100 border border-gray-700">{dayTagForSelectedDate}</span></>
              ) : null}
            </div>
          </div>

          <div className="space-y-6 mt-3">
            {/* Exercise (filtered) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300 mb-2">Exercise *</label>
                <span className="text-xs text-gray-500">{filteredExercises.length} available</span>
              </div>
              <select
                value={formData.exercise}
                onChange={(e) => setFormData({ ...formData, exercise: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">
                  {filteredExercises.length === 0 ? 'No exercises for current selection' : 'Select exercise'}
                </option>
                {filteredExercises.map(exercise => (
                  <option key={exercise} value={exercise}>{exercise}</option>
                ))}
              </select>

              {/* NEW: Unilateral indicator */}
              <div className="flex items-center gap-2 -mt-2 pt-2">
                <input
                  id="unilateral"
                  type="checkbox"
                  checked={formData.isUnilateral}
                  onChange={(e) => setFormData({ ...formData, isUnilateral: e.target.checked })}
                  className="accent-blue-500"
                />
                <label htmlFor="unilateral" className="text-sm text-gray-300">
                  Unilateral set
                </label>
                <span className="text-xs text-gray-500">
                  (Flag only)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Weight (lbs) *</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="5"
                  required
                />
              </div>

              {/* Reps */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reps *</label>
                <input
                  type="number"
                  value={formData.reps}
                  onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors text-lg"
            >
              {status === 'submitting' ? 'Saving...' : '➕ Add Set'}
            </button>
          </div>
        </form>

        {/* ===================== Workout History (selected date) ===================== */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Workout History for {formData.date}</h3>
          <div className="flex items-center gap-2 mb-3">
            {dayTagForSelectedDate && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-100 border border-gray-700">
                {dayTagForSelectedDate}
              </span>
            )}
            <span className="text-gray-400 text-sm">
              {Object.keys(liftsByExerciseForSelectedDate).length} exercise
              {Object.keys(liftsByExerciseForSelectedDate).length !== 1 ? 's' : ''} ·{' '}
              {totalVolumeForSelectedDate.toLocaleString()} lbs total
            </span>
          </div>

          {liftsForSelectedDate.length === 0 ? (
            <p className="text-gray-400 text-sm">No sets yet for this date.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(liftsByExerciseForSelectedDate).map(([exercise, sets]) => {
                const exerciseVolume = sets.reduce((sum, set) => sum + (set.weight * set.reps), 0)
                return (
                  <div key={exercise} className="bg-gray-850 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{exercise}</span>
                      <span className="text-gray-400 text-sm">{exerciseVolume.toLocaleString()} lbs</span>
                    </div>
                    <div className="space-y-1">
                      {sets.map((set) => (
                        <div
                          key={set.id}
                          className="flex justify-between items-center text-sm bg-gray-800 rounded px-3 py-2"
                        >
                          <div className="flex items-center">
                            <span className="text-gray-300">
                              Set {set.setNumber}: {set.weight} lbs × {set.reps} reps
                            </span>
                            {set.isUnilateral ? (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-gray-200 border border-gray-700 uppercase tracking-wide">
                                UNI
                              </span>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingLift(set)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(set.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
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
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== Day Info Sheet ===== */}
      <Sheet open={showDayInfo} onClose={() => setShowDayInfo(false)} title="Day Information">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const tag = (formData.dayTag || '').trim() || null
            try {
              await setDayTagForDate(formData.date, tag)
              await fetchAllLifts()
              await fetchDayTags()
              const normalized = (tag || '').trim().toLowerCase()
              if (normalized && DAYTAG_DEFAULTS[normalized]) {
                setSelectedBodyParts(DAYTAG_DEFAULTS[normalized])
                lastAppliedDayTagRef.current = normalized
              }
              setShowDayInfo(false)
            } catch (err) {
              console.error('Failed to save day info:', err)
              alert('Failed to save. Try again.')
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
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Workout Day (optional)</label>
            <input
              type="text"
              list="dayTagOptions"
              value={formData.dayTag}
              onChange={(e) => setFormData({ ...formData, dayTag: e.target.value })}
              onBlur={async () => {
                const tag = (formData.dayTag || '').trim() || null
                try {
                  await setDayTagForDate(formData.date, tag)
                  await fetchAllLifts()
                  await fetchDayTags()
                } catch {}
              }}
              placeholder="e.g., Push Day / Pull Day / Leg Day"
              className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <datalist id="dayTagOptions">
              {dayTagSuggestions.map(tag => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-gray-500">
              Recognized days auto-prefill body parts. You can override anytime in Body Parts.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </Sheet>

      {/* ===== Body Parts Sheet ===== */}
      <Sheet open={showBodyParts} onClose={() => setShowBodyParts(false)} title="Target Body Parts">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-400">
            Check the muscle groups you’re targeting today.
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 text-gray-200"
              onClick={() => setSelectedBodyParts(ALL_BODY_PARTS)}
              title="Select all"
            >
              Select All
            </button>
            <button
              className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 text-gray-200"
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
                  'flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-blue-900/30 border-blue-700 text-blue-200'
                    : 'bg-gray-850 border-gray-700 text-gray-200 hover:bg-gray-800'
                ].join(' ')}
              >
                <span className="capitalize">{bp}</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleBodyPart(bp)}
                  className="accent-blue-500"
                  aria-label={`Toggle ${bp}`}
                  onClick={(e) => e.stopPropagation()}
                />
              </button>
            )
          })}
        </div>

        <div className="pt-4 space-y-2">
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            onClick={async () => {
              try {
                await setBodyPartsForDate(formData.date, selectedBodyParts)
                setShowBodyParts(false)
              } catch (e) {
                console.error('Failed to save body parts:', e)
                alert('Failed to save body parts. Try again.')
              }
            }}
          >
            Save Body Parts
          </button>
          <button
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors"
            onClick={() => setShowBodyParts(false)}
          >
            Done
          </button>
        </div>
      </Sheet>

      {/* Edit Modal */}
      {editingLift && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Edit Set</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={editingLift.date}
                  onChange={(e) => setEditingLift({ ...editingLift, date: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exercise</label>
                <select
                  value={editingLift.exercise}
                  onChange={(e) => setEditingLift({ ...editingLift, exercise: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                >
                  {Array.from(new Set(Object.values(EXERCISES_BY_BODY_PART).flat())).sort().map(exercise => (
                    <option key={exercise} value={exercise}>{exercise}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Weight (lbs)</label>
                  <input
                    type="number"
                    value={editingLift.weight}
                    onChange={(e) => setEditingLift({ ...editingLift, weight: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                    min="0"
                    step="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reps</label>
                  <input
                    type="number"
                    value={editingLift.reps}
                    onChange={(e) => setEditingLift({ ...editingLift, reps: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              {/* NEW: Unilateral in Edit */}
              <div className="flex items-center gap-2">
                <input
                  id="edit-unilateral"
                  type="checkbox"
                  checked={!!editingLift.isUnilateral}
                  onChange={(e) => setEditingLift({ ...editingLift, isUnilateral: e.target.checked })}
                  className="accent-blue-500"
                />
                <label htmlFor="edit-unilateral" className="text-sm text-gray-300">
                  Unilateral set
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Set Number</label>
                <input
                  type="number"
                  value={editingLift.setNumber}
                  onChange={(e) => setEditingLift({ ...editingLift, setNumber: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Day Tag</label>
                <input
                  type="text"
                  list="dayTagOptions_edit"
                  value={editingLift.dayTag ?? ''}
                  onChange={(e) => setEditingLift({ ...editingLift, dayTag: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                  placeholder="e.g., Push Day"
                />
                <datalist id="dayTagOptions_edit">
                  {dayTagSuggestions.map(tag => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingLift(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
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
