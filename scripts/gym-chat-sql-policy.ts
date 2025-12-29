import assert from 'node:assert/strict'

import { validateAndRewriteSql } from '@/lib/gym-chat/sql-policy'

const run = () => {
  const result = validateAndRewriteSql(
    'SELECT date, exercise, weight FROM gym_lifts WHERE exercise = $1 ORDER BY date DESC',
    ['Bench Press'],
  )

  assert.ok(result.sql.toLowerCase().includes('limit'))
  assert.ok(result.sql.toLowerCase().includes('where'))

  const trend = validateAndRewriteSql(
    "SELECT DATE_TRUNC('week', date) AS week, COUNT(*) AS sets FROM gym_lifts GROUP BY week ORDER BY week",
    [],
  )
  assert.ok(trend.sql.toLowerCase().includes('12 months'))

  const allTime = validateAndRewriteSql(
    "/*policy:time_window=all_time*/ SELECT exercise, SUM(weight * reps) AS volume FROM gym_lifts GROUP BY exercise",
    [],
  )
  assert.equal(allTime.appliedTimeWindow, 'all_time')

  assert.throws(() => {
    validateAndRewriteSql('SELECT * FROM gym_lifts', [])
  })

  const bodyPart = validateAndRewriteSql(
    `SELECT body_part, COUNT(*) FROM gym_day_meta CROSS JOIN LATERAL UNNEST(body_parts) AS bp(body_part) WHERE date >= CURRENT_DATE - ($1)::interval GROUP BY body_part`,
    [7],
  )
  assert.ok(bodyPart.sql.includes('body_part'))

  const subquery = validateAndRewriteSql(
    `SELECT lacking.body_part, lacking.total_sets FROM (SELECT body_part, COUNT(*) AS total_sets FROM gym_day_meta CROSS JOIN LATERAL UNNEST(body_parts) AS bp(body_part) WHERE date >= CURRENT_DATE - ($1)::interval GROUP BY body_part) AS lacking ORDER BY total_sets ASC LIMIT 1`,
    ['90 days'],
  )
  assert.ok(subquery.sql.toLowerCase().includes('lacking'))

  console.log('gym-chat sql policy checks passed.')
}

run()
