// app/gym-entry-secret/actions.ts
'use server'

import { put, list } from '@vercel/blob'

export interface GymLift {
  id: string
  date: string
  exercise: string
  weight: number
  reps: number
  sets: number
  timestamp: string
}

const BLOB_FILENAME = 'gym-lifts.json'

// Check if we're in development mode without proper Blob setup
const isDevelopmentMode = () => {
  return !process.env.BLOB_READ_WRITE_TOKEN || process.env.NODE_ENV === 'development'
}

// Mock data for development
const mockLifts: GymLift[] = [
  {
    id: 'mock_1',
    date: '2025-10-22',
    exercise: 'Bench Press',
    weight: 185,
    reps: 8,
    sets: 4,
    timestamp: '2025-10-22T10:00:00Z'
  },
  {
    id: 'mock_2',
    date: '2025-10-22',
    exercise: 'Squat',
    weight: 225,
    reps: 6,
    sets: 4,
    timestamp: '2025-10-22T10:15:00Z'
  },
  {
    id: 'mock_3',
    date: '2025-10-20',
    exercise: 'Deadlift',
    weight: 275,
    reps: 5,
    sets: 3,
    timestamp: '2025-10-20T10:00:00Z'
  }
]

// Get all lifts from blob storage
export async function getGymLifts(): Promise<GymLift[]> {
  // Development fallback
  if (isDevelopmentMode()) {
    console.log('⚠️  Using mock data - Vercel Blob not configured for development')
    return mockLifts
  }

  try {
    // List all blobs to find our file
    const { blobs } = await list()
    const gymLiftsBlob = blobs.find(blob => blob.pathname === BLOB_FILENAME)
    
    if (!gymLiftsBlob) {
      console.log('No gym-lifts.json found, returning empty array')
      return []
    }
    
    // Fetch the blob content
    const response = await fetch(gymLiftsBlob.url)
    
    if (!response.ok) {
      console.error('Failed to fetch blob:', response.statusText)
      return []
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching lifts:', error)
    return []
  }
}

// Add a new lift
export async function addGymLift(lift: Omit<GymLift, 'id' | 'timestamp'>) {
  // Development fallback
  if (isDevelopmentMode()) {
    console.log('⚠️  Development mode - data not actually saved')
    const newLift: GymLift = {
      ...lift,
      id: `dev_${Date.now()}`,
      timestamp: new Date().toISOString()
    }
    return { success: true, data: newLift, dev: true }
  }

  try {
    // Get existing lifts
    const existingLifts = await getGymLifts()
    
    // Create new lift with ID and timestamp
    const newLift: GymLift = {
      ...lift,
      id: `lift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }
    
    // Add to array
    const updatedLifts = [...existingLifts, newLift]
    
    // Upload to blob storage
    const blob = await put(BLOB_FILENAME, JSON.stringify(updatedLifts, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })
    
    console.log('✅ Lift saved successfully:', blob.url)
    return { success: true, data: newLift, url: blob.url }
  } catch (error) {
    console.error('❌ Error adding lift:', error)
    return { success: false, error: 'Failed to save lift' }
  }
}

// Delete a lift by ID
export async function deleteGymLift(id: string) {
  if (isDevelopmentMode()) {
    return { success: true, dev: true }
  }

  try {
    const existingLifts = await getGymLifts()
    const updatedLifts = existingLifts.filter(lift => lift.id !== id)
    
    await put(BLOB_FILENAME, JSON.stringify(updatedLifts, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting lift:', error)
    return { success: false, error: 'Failed to delete lift' }
  }
}

// Get recent lifts (last N)
export async function getRecentLifts(limit: number = 10): Promise<GymLift[]> {
  const allLifts = await getGymLifts()
  return allLifts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}