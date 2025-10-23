// app/demos/gym-dashboard/form/actions.ts
'use server'

import { put, list, del } from '@vercel/blob'

export interface GymLift {
  id: string
  date: string
  exercise: string
  weight: number
  reps: number
  setNumber: number  // Changed from 'sets' to 'setNumber' for consistency
  timestamp: string
}

const BLOB_FILENAME = 'gym-lifts.json'

// Check if we're in development mode without proper Blob setup
const isDevelopmentMode = () => {
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!hasToken) {
    console.log('⚠️  BLOB_READ_WRITE_TOKEN not found')
  }
  
  return !hasToken || isDev
}

// Mock data for development
const mockLifts: GymLift[] = [
  {
    id: 'mock_1',
    date: '2025-10-22',
    exercise: 'Bench Press',
    weight: 185,
    reps: 8,
    setNumber: 4,
    timestamp: '2025-10-22T10:00:00Z'
  },
  {
    id: 'mock_2',
    date: '2025-10-22',
    exercise: 'Squat',
    weight: 225,
    reps: 6,
    setNumber: 4,
    timestamp: '2025-10-22T10:15:00Z'
  },
  {
    id: 'mock_3',
    date: '2025-10-20',
    exercise: 'Deadlift',
    weight: 275,
    reps: 5,
    setNumber: 3,
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
      console.log('No gym-lifts.json found, initializing with empty array')
      // Initialize with empty array
      await put(BLOB_FILENAME, JSON.stringify([]), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      })
      return []
    }
    
    // Fetch the blob content
    const response = await fetch(gymLiftsBlob.url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.statusText}`)
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching lifts:', error)
    throw error // Propagate error instead of silently returning empty array
  }
}

// Add a new lift
export async function addGymLift(lift: Omit<GymLift, 'id' | 'timestamp'>) {
  // Development fallback
  if (isDevelopmentMode()) {
    console.log('⚠️  Development mode - data not actually saved to Vercel Blob')
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save lift' 
    }
  }
}

// Update an existing lift
export async function updateGymLift(id: string, updates: Partial<Omit<GymLift, 'id' | 'timestamp'>>) {
  if (isDevelopmentMode()) {
    console.log('⚠️  Development mode - update not actually saved')
    return { success: true, dev: true }
  }

  try {
    const existingLifts = await getGymLifts()
    const liftIndex = existingLifts.findIndex(lift => lift.id === id)
    
    if (liftIndex === -1) {
      return { success: false, error: 'Lift not found' }
    }
    
    // Update the lift while preserving id and timestamp
    const updatedLift: GymLift = {
      ...existingLifts[liftIndex],
      ...updates,
      id: existingLifts[liftIndex].id, // Preserve original id
      timestamp: existingLifts[liftIndex].timestamp, // Preserve original timestamp
    }
    
    const updatedLifts = [...existingLifts]
    updatedLifts[liftIndex] = updatedLift
    
    // Save to blob
    await put(BLOB_FILENAME, JSON.stringify(updatedLifts, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })
    
    console.log('✅ Lift updated successfully')
    return { success: true, data: updatedLift }
  } catch (error) {
    console.error('❌ Error updating lift:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update lift' 
    }
  }
}

// Delete a lift by ID
export async function deleteGymLift(id: string) {
  if (isDevelopmentMode()) {
    console.log('⚠️  Development mode - delete not actually performed')
    return { success: true, dev: true }
  }

  try {
    const existingLifts = await getGymLifts()
    const filteredLifts = existingLifts.filter(lift => lift.id !== id)
    
    if (filteredLifts.length === existingLifts.length) {
      return { success: false, error: 'Lift not found' }
    }
    
    await put(BLOB_FILENAME, JSON.stringify(filteredLifts, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    })
    
    console.log('✅ Lift deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('❌ Error deleting lift:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete lift' 
    }
  }
}

// Get recent lifts (last N)
export async function getRecentLifts(limit: number = 10): Promise<GymLift[]> {
  try {
    const allLifts = await getGymLifts()
    return allLifts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error('Error getting recent lifts:', error)
    return []
  }
}