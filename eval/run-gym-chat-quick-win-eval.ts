import { strict as assert } from 'node:assert'

import { isClarificationAnswer } from '../lib/gym-chat/conversation'
import { __testUtils } from '../app/api/gym-chat/route'

const {
  extractIntervalHints,
  coerceIntervalParams,
  parseTimeframeAnswer,
  buildTimeframedQuestion,
  shouldPreferGymDataForLogQuestion,
} = __testUtils

const runQuickWinEval = () => {
  const pendingTimeframe = { kind: 'timeframe' } as const

  assert.equal(isClarificationAnswer(pendingTimeframe, 'recent'), true)
  const ambiguous = parseTimeframeAnswer('recent')
  assert.equal(ambiguous.timeframe, undefined)
  const bareSince = parseTimeframeAnswer('since')
  assert.equal(bareSince.timeframe, undefined)

  const explicit = parseTimeframeAnswer('last 8 weeks')
  assert.equal(explicit.timeframe, '8 weeks')
  const rewritten = buildTimeframedQuestion('How many sessions did I log?', explicit.timeframe ?? '')
  assert.match(rewritten.toLowerCase(), /last 8 weeks/)

  const hints = extractIntervalHints('compare last 7 days vs last 7 weeks')
  assert.deepEqual(hints, ['day', 'week'])
  const sql =
    'SELECT * FROM gym_lifts WHERE performed_at >= CURRENT_DATE - ($2)::interval ' +
    'AND performed_at < CURRENT_DATE - ($3)::interval'
  const params = ['bench', 7, 7]
  const coerced = coerceIntervalParams(sql, params, hints)
  assert.deepEqual(coerced, ['bench', '7 days', '7 weeks'])

  assert.equal(shouldPreferGymDataForLogQuestion('Show my sessions from the last 8 weeks.'), true)
  assert.equal(shouldPreferGymDataForLogQuestion('My recent sessions'), true)
  assert.equal(shouldPreferGymDataForLogQuestion('How should I train for the next 8 weeks?'), false)

  console.log('Gym Chat quick win eval passed.')
}

runQuickWinEval()
