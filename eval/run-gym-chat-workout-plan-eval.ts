import { strict as assert } from 'node:assert'

import { classifyTurnMode } from '../lib/gym-chat/conversation'
import {
  buildPlanCorrectionAcknowledgement,
  buildWorkoutPlanFallbackMessage,
  buildWorkoutPlanFromHistory,
} from '../lib/gym-chat/response-utils'
import { mergeWorkoutPlanMeta, parseWorkoutPlanMeta } from '../lib/gym-chat/workout-planner'

const runWorkoutPlanMetaEval = () => {
  const initial = parseWorkoutPlanMeta(
    'I am planning a lower day tomorrow. Help me plan my sets for Quads. Use my previous lifts to inform these decisions.',
  )
  assert.deepEqual(initial.targetsMuscles?.include, ['quads'])
  assert.equal(initial.usesHistoricalLifts, true)

  const correction = parseWorkoutPlanMeta('Ensure your suggestions are ONLY for quads.')
  assert.deepEqual(correction.targetsMuscles?.include, ['quads'])
  assert.equal(correction.targetsMuscles?.strict, true)

  const merged = mergeWorkoutPlanMeta(
    { targetsMuscles: initial.targetsMuscles, usesHistoricalLifts: true },
    { usesHistoricalLifts: true },
  )
  assert.deepEqual(merged?.targetsMuscles?.include, ['quads'])
  assert.equal(merged?.usesHistoricalLifts, true)

  const acknowledgement = buildPlanCorrectionAcknowledgement(correction.targetsMuscles)
  assert.ok(/quads/i.test(acknowledgement))

  const fallback = buildWorkoutPlanFallbackMessage({
    constraint: correction.targetsMuscles,
    usesHistoricalLifts: true,
    acknowledgement,
  })
  const lowered = fallback.toLowerCase()
  assert.ok(!lowered.includes('calf'))
  assert.ok(!lowered.includes('hamstring'))
  assert.ok(!lowered.includes('glute'))

  const historyMessage = buildWorkoutPlanFromHistory({
    query: {
      id: 'q1',
      purpose: 'History',
      sql: 'SELECT 1',
      params: ['12 months'],
      rowCount: 2,
      durationMs: 0,
      previewRows: [
        {
          exercise: 'Back Squat',
          total_sets: 12,
          last_working_weight: 225,
          last_working_reps: 6,
          last_working_at: '2024-02-10',
        },
        {
          exercise: 'Leg Press',
          total_sets: 10,
          last_working_weight: 360,
          last_working_reps: 10,
          last_working_at: '2024-02-12',
        },
      ],
      error: null,
    },
    constraint: correction.targetsMuscles,
    usesHistoricalLifts: true,
  })
  assert.ok(historyMessage)
  const historyLowered = historyMessage?.toLowerCase() ?? ''
  assert.ok(historyLowered.includes('back squat'))
  assert.ok(historyLowered.includes('225'))
  assert.ok(!historyLowered.includes('hamstring'))

  const turnMode = classifyTurnMode({
    message: 'It is.',
    state: { lastPlanMeta: { targetsMuscles: { include: ['quads'], strict: true } } },
  })
  assert.equal(turnMode, 'analysis_followup')

  console.log('Gym Chat workout plan meta eval passed.')
}

runWorkoutPlanMetaEval()
