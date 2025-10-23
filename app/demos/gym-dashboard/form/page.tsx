'use client'

import { useState, useEffect } from 'react'
import { addGymLift, getGymLifts, deleteGymLift, type GymLift } from './actions'

export default function GymEntryForm() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    exercise: '',
    weight: '',
    reps: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [allLifts, setAllLifts] = useState<GymLift[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingLift, setEditingLift] = useState<GymLift | null>(null)

  const exercises = [
    'Bench Press',
    'Squat',
    'Deadlift',
    'Overhead Press',
    'Barbell Row',
    'Pull-ups',
    'Dips',
    'Romanian Deadlift',
    'Front Squat',
    'Incline Bench Press',
    'Leg Press',
    'Leg Curl',
    'Leg Extension',
    'Calf Raises',
    'Bicep Curls',
    'Tricep Pushdown',
    'Lateral Raises',
    'Face Pulls'
  ]

  // Check authentication on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('gymAuth') === 'true') {
      setIsAuthenticated(true)
      fetchAllLifts()
    }
  }, [])

  const fetchAllLifts = async () => {
    const lifts = await getGymLifts()
    setAllLifts(lifts)
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'dillonlifts') {
      setIsAuthenticated(true)
      localStorage.setItem('gymAuth', 'true')
      fetchAllLifts()
    } else {
      alert('Incorrect password')
      setPassword('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    
    try {
      // Find the next set number for this exercise on this date
      const existingSets = allLifts.filter(
        lift => lift.date === formData.date && lift.exercise === formData.exercise
      )
      const nextSetNumber = existingSets.length > 0 
        ? Math.max(...existingSets.map(s => s.setNumber)) + 1 
        : 1

      const result = await addGymLift({
        date: formData.date,
        exercise: formData.exercise,
        weight: parseInt(formData.weight),
        reps: parseInt(formData.reps),
        setNumber: nextSetNumber,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setStatus('success')
      
      // Reset weight and reps, keep date and exercise for next set
      setFormData({
        ...formData,
        weight: '',
        reps: '',
      })
      
      // Refresh lifts
      fetchAllLifts()
      
      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving data:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this set?')) return
    
    const result = await deleteGymLift(id)
    if (result.success) {
      fetchAllLifts()
    }
  }

  const handleEdit = (lift: GymLift) => {
    setEditingLift(lift)
  }

  const handleUpdate = async () => {
    if (!editingLift) return
    
    // Delete old and add new (simpler than adding update function)
    await deleteGymLift(editingLift.id)
    
    const result = await addGymLift({
      date: editingLift.date,
      exercise: editingLift.exercise,
      weight: editingLift.weight,
      reps: editingLift.reps,
      setNumber: editingLift.setNumber,
    })

    if (result.success) {
      setEditingLift(null)
      fetchAllLifts()
    }
  }

  // Group lifts by date
  const liftsByDate = allLifts.reduce((acc, lift) => {
    if (!acc[lift.date]) {
      acc[lift.date] = []
    }
    acc[lift.date].push(lift)
    return acc
  }, {} as Record<string, GymLift[]>)

  const sortedDates = Object.keys(liftsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  // Group sets by exercise within a date
  const groupByExercise = (lifts: GymLift[]) => {
    const grouped = lifts.reduce((acc, lift) => {
      if (!acc[lift.exercise]) {
        acc[lift.exercise] = []
      }
      acc[lift.exercise].push(lift)
      return acc
    }, {} as Record<string, GymLift[]>)

    // Sort sets within each exercise by setNumber
    Object.keys(grouped).forEach(exercise => {
      grouped[exercise].sort((a, b) => a.setNumber - b.setNumber)
    })

    return grouped
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6">🏋️ Gym Tracker Access</h1>
          <form onSubmit={handlePasswordSubmit}>
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
          <p className="text-gray-500 text-xs mt-4 text-center">
            This page is password protected
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">💪 Gym Tracker</h1>
          <div className="flex gap-2">
            <a
              href="/demos/gym-dashboard"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
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
            <p className="text-red-400">❌ Error saving data. Check your Vercel Blob setup.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-700 p-8 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Add New Set</h2>
          <div className="space-y-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Exercise */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exercise *
              </label>
              <select
                value={formData.exercise}
                onChange={(e) => setFormData({...formData, exercise: e.target.value})}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select exercise</option>
                {exercises.map(exercise => (
                  <option key={exercise} value={exercise}>{exercise}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Weight (lbs) *
                </label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="5"
                  required
                />
              </div>

              {/* Reps */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reps *
                </label>
                <input
                  type="number"
                  value={formData.reps}
                  onChange={(e) => setFormData({...formData, reps: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors text-lg"
            >
              {status === 'submitting' ? 'Saving...' : '➕ Add Set'}
            </button>
          </div>
        </form>

        {/* Lifts by Date */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📅 Workout History</h3>
          <div className="space-y-2">
            {sortedDates.map(date => {
              const lifts = liftsByDate[date]
              const exerciseGroups = groupByExercise(lifts)
              const totalVolume = lifts.reduce((sum, lift) => 
                sum + (lift.weight * lift.reps), 0
              )
              
              return (
                <div key={date}>
                  <button
                    onClick={() => setSelectedDate(selectedDate === date ? null : date)}
                    className="w-full bg-gray-800 hover:bg-gray-750 rounded-lg p-4 text-left transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-white font-medium">{date}</span>
                        <span className="text-gray-400 text-sm ml-3">
                          {Object.keys(exerciseGroups).length} exercise{Object.keys(exerciseGroups).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 text-sm">Total Volume</div>
                        <div className="text-blue-400 font-medium">
                          {totalVolume.toLocaleString()} lbs
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {selectedDate === date && (
                    <div className="mt-2 space-y-3 pl-4">
                      {Object.entries(exerciseGroups).map(([exercise, sets]) => {
                        const exerciseVolume = sets.reduce((sum, set) => 
                          sum + (set.weight * set.reps), 0
                        )
                        
                        return (
                          <div key={exercise} className="bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-white font-medium">{exercise}</h4>
                              <span className="text-gray-400 text-sm">
                                {sets.length} set{sets.length !== 1 ? 's' : ''} • {exerciseVolume.toLocaleString()} lbs
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              {sets.map(set => (
                                <div key={set.id} className="flex justify-between items-center bg-gray-750 rounded p-2 text-sm">
                                  <div className="flex items-center gap-3">
                                    <span className="text-gray-500 font-mono text-xs w-8">
                                      Set {set.setNumber}
                                    </span>
                                    <span className="text-white">
                                      {set.weight}lbs × {set.reps} reps
                                    </span>
                                    <span className="text-gray-500 text-xs">
                                      = {(set.weight * set.reps).toLocaleString()} lbs
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleEdit(set)}
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              )
            })}
          </div>
        </div>
      </div>

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
                  onChange={(e) => setEditingLift({...editingLift, date: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exercise</label>
                <select
                  value={editingLift.exercise}
                  onChange={(e) => setEditingLift({...editingLift, exercise: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                >
                  {exercises.map(exercise => (
                    <option key={exercise} value={exercise}>{exercise}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Weight (lbs)</label>
                  <input
                    type="number"
                    value={editingLift.weight}
                    onChange={(e) => setEditingLift({...editingLift, weight: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reps</label>
                  <input
                    type="number"
                    value={editingLift.reps}
                    onChange={(e) => setEditingLift({...editingLift, reps: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Set Number</label>
                <input
                  type="number"
                  value={editingLift.setNumber}
                  onChange={(e) => setEditingLift({...editingLift, setNumber: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg"
                  min="1"
                />
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