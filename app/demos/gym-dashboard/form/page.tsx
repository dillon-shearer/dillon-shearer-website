'use client'

import { useState, useEffect } from 'react'
import { addGymLift, getRecentLifts, type GymLift } from './actions'

export default function GymEntryForm() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    exercise: '',
    weight: '',
    reps: '',
    sets: ''
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [recentLifts, setRecentLifts] = useState<GymLift[]>([])

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
      fetchRecentLifts()
    }
  }, [])

  const fetchRecentLifts = async () => {
    const lifts = await getRecentLifts(5)
    setRecentLifts(lifts)
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === 'dillonlifts') {
      setIsAuthenticated(true)
      localStorage.setItem('gymAuth', 'true')
      fetchRecentLifts()
    } else {
      alert('Incorrect password')
      setPassword('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    
    try {
      const result = await addGymLift({
        date: formData.date,
        exercise: formData.exercise,
        weight: parseInt(formData.weight),
        reps: parseInt(formData.reps),
        sets: parseInt(formData.sets),
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setStatus('success')
      
      // Reset form but keep today's date
      setFormData({
        date: formData.date,
        exercise: '',
        weight: '',
        reps: '',
        sets: ''
      })
      
      // Refresh recent lifts
      fetchRecentLifts()
      
      setTimeout(() => setStatus('idle'), 2000)
    } catch (error) {
      console.error('Error saving data:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
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
          <h1 className="text-3xl font-bold text-white">💪 Add Lift Data</h1>
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
            <p className="text-green-400">✅ Lift saved to Vercel Blob storage!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-400">❌ Error saving data. Check your Vercel Blob setup.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-700 p-8 mb-6">
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

            <div className="grid grid-cols-3 gap-4">
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

              {/* Sets */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sets *
                </label>
                <input
                  type="number"
                  value={formData.sets}
                  onChange={(e) => setFormData({...formData, sets: e.target.value})}
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
              {status === 'submitting' ? 'Saving...' : '➕ Add Lift'}
            </button>
          </div>
        </form>

        {/* Recent Lifts */}
        {recentLifts.length > 0 && (
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📝 Recent Lifts</h3>
            <div className="space-y-2">
              {recentLifts.map((lift) => (
                <div key={lift.id} className="bg-gray-800 rounded p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-white font-medium">{lift.exercise}</span>
                      <span className="text-gray-400 ml-2">
                        {lift.weight}lbs × {lift.reps} reps × {lift.sets} sets
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">{lift.date}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    Volume: {(lift.weight * lift.reps * lift.sets).toLocaleString()} lbs
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-gray-900 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">📊 How It Works</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Data saved to Vercel Blob storage</li>
            <li>• Updates appear on dashboard immediately</li>
            <li>• Persistent across all devices</li>
            <li>• Volume = Weight × Reps × Sets</li>
          </ul>
        </div>
      </div>
    </div>
  )
}