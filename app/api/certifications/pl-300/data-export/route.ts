import { NextResponse } from 'next/server'
import { getGymLifts } from '@/app/demos/gym-dashboard/form/actions'
import { listExercises, listBodyParts } from '@/app/demos/gym-dashboard/catalog'
import JSZip from 'jszip'

// Helper to convert array of objects to CSV
function arrayToCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      // Handle null/undefined
      if (value === null || value === undefined) return ''
      // Quote strings that contain commas or quotes
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    })
    rows.push(values.join(','))
  }

  return rows.join('\n')
}

export async function GET() {
  try {
    // Fetch all data
    const lifts = await getGymLifts()
    const exercises = await listExercises()
    const bodyParts = await listBodyParts()

    // 1. Workout Sets CSV (Fact Table)
    const workoutHeaders = [
      'id',
      'date',
      'exercise',
      'weight',
      'reps',
      'setNumber',
      'timestamp',
      'dayTag',
      'isUnilateral',
      'equipment'
    ]
    const workoutCSV = arrayToCSV(lifts, workoutHeaders)

    // 2. Exercise Reference CSV (Dimension Table)
    const exerciseData = exercises.map(ex => ({
      id: ex.id,
      exercise_name: ex.name,
      body_part_key: ex.bodyPartKey || '',
      is_active: ex.isActive
    }))
    const exerciseHeaders = ['id', 'exercise_name', 'body_part_key', 'is_active']
    const exerciseCSV = arrayToCSV(exerciseData, exerciseHeaders)

    // 3. Body Parts CSV (Dimension Table)
    const bodyPartData = bodyParts.map(bp => ({
      body_part_key: bp.key,
      body_part_label: bp.label
    }))
    const bodyPartHeaders = ['body_part_key', 'body_part_label']
    const bodyPartCSV = arrayToCSV(bodyPartData, bodyPartHeaders)

    // Create ZIP file
    const zip = new JSZip()
    zip.file('workout_sets.csv', workoutCSV)
    zip.file('dim_exercises.csv', exerciseCSV)
    zip.file('dim_body_parts.csv', bodyPartCSV)

    // Add README
    const readme = `# PL-300 Case Study Data Files

## Overview
This data package contains real gym workout data split across three files for use in the Power BI Data Analyst (PL-300) certification case study.

## Files Included

### 1. workout_sets.csv (Fact Table)
Individual workout sets with details about each lift performed.

**Columns:**
- id: Unique identifier for each set
- date: Date of the workout (YYYY-MM-DD)
- exercise: Name of the exercise
- weight: Weight lifted (in pounds or kg)
- reps: Number of repetitions
- setNumber: Set number within the workout
- timestamp: Full timestamp of when the set was logged
- dayTag: Workout split tag (e.g., "push day", "leg day")
- isUnilateral: Whether the exercise is unilateral (true/false)
- equipment: Equipment used (e.g., "barbell", "dumbbell")

**Use in Power BI:** This is your fact table containing the transactional data.

### 2. dim_exercises.csv (Dimension Table)
Exercise catalog with body part mappings.

**Columns:**
- id: Unique identifier for the exercise
- exercise_name: Name of the exercise
- body_part_key: Key linking to body parts table
- is_active: Whether the exercise is currently active

**Use in Power BI:** This is a dimension table for exercise lookups and categorization.

### 3. dim_body_parts.csv (Dimension Table)
Body part/muscle group reference.

**Columns:**
- body_part_key: Unique key for the body part
- body_part_label: Human-readable label

**Use in Power BI:** This is a dimension table for muscle group categorization.

## Suggested Data Model (Star Schema)

\`\`\`
workout_sets (Fact)
├── [exercise] → dim_exercises[exercise_name] (many-to-one)
├── [date] → Date[Date] (many-to-one, create Date table in Power BI)
└── dim_exercises
    └── [body_part_key] → dim_body_parts[body_part_key] (many-to-one)
\`\`\`

## Getting Started

1. Extract all files from this ZIP
2. Open Power BI Desktop
3. Import workout_sets.csv using "Text/CSV" connector
4. Import dim_exercises.csv
5. Import dim_body_parts.csv
6. Create a Date table using DAX
7. Build relationships as shown above
8. Follow the case study steps!

## Questions?
Refer to the case study guide for detailed step-by-step instructions.

Good luck with your PL-300 prep! 🚀
`
    zip.file('README.md', readme)

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="pl300-gym-data.zip"',
        'Cache-Control': 'private, max-age=0, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Error generating data export:', error)
    return NextResponse.json(
      { error: 'Failed to generate data export' },
      { status: 500 }
    )
  }
}
