import assert from 'node:assert/strict'

import {
  buildFavoriteSplitDayPlan,
  buildLightWeightProgressPlan,
  buildMuscleGroupComparisonPlan,
  buildProgressiveOverloadPlan,
  buildReturnEffortVolumePlan,
  buildReturnEffortProgressionPlan,
  buildSessionCountPlan,
  buildSetCountPlan,
  buildStalledLiftsPlan,
  buildTopWeightSetsPlan,
  buildTopEndEffortsComparisonPlan,
  buildTopEndEffortsPlan,
  buildVolumeRankingPlan,
  buildWeeklyVolumePlan,
  buildWorstDayVolumePlan,
} from '@/lib/gym-chat/canonical-plans'
import { buildSetsBaseCte } from '@/lib/gym-chat/sql-builders'
import { buildWorkoutPlanQueries } from '@/lib/gym-chat/workout-planner'

const stripBaseCte = (sql: string) => {
  const lowered = sql.toLowerCase()
  const marker = 'with sets as ('
  const start = lowered.indexOf(marker)
  if (start === -1) return sql
  let depth = 0
  for (let i = start; i < sql.length; i += 1) {
    const char = sql[i]
    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth === 0) {
        return sql.slice(i + 1)
      }
    }
  }
  return sql
}

const assertNoAliasLeaks = (sql: string, label: string) => {
  const stripped = stripBaseCte(sql)
  assert.ok(!/\bgym_lifts\b/i.test(stripped), `${label}: gym_lifts referenced outside base CTE`)
  assert.ok(!/\bgl\./i.test(stripped), `${label}: gl alias referenced outside base CTE`)
}

const assertTypedCoalesce = (sql: string, label: string) => {
  const matches = sql.match(/COALESCE\([^)]*\)/gi) ?? []
  matches.forEach(match => {
    if (/timestamp/i.test(match)) {
      assert.ok(!/\$\d+|'.*?'/i.test(match), `${label}: timestamp COALESCE mixes text or params`)
    }
  })
}

const assertIntervalParamsUsed = (sql: string, params: unknown[], label: string) => {
  params.forEach((param, index) => {
    if (typeof param !== 'string') return
    if (!/\d+\s+(day|week|month|year)s?/i.test(param)) return
    const placeholder = `($${index + 1})::interval`
    assert.ok(sql.includes(placeholder), `${label}: missing interval placeholder for $${index + 1}`)
  })
}

const run = () => {
  const lifts = buildSetsBaseCte()

  assert.ok(/::timestamptz/i.test(lifts.cte), 'sets CTE should cast timestamps to timestamptz')
  assert.ok(/::date/i.test(lifts.cte), 'sets CTE should cast dates to date')

  const plans = [
    { name: 'progressive-overload', plan: buildProgressiveOverloadPlan(lifts) },
    { name: 'return-effort-volume', plan: buildReturnEffortVolumePlan(lifts) },
    { name: 'return-effort-progression', plan: buildReturnEffortProgressionPlan(lifts) },
    { name: 'set-count', plan: buildSetCountPlan(lifts) },
    { name: 'volume-ranking', plan: buildVolumeRankingPlan(lifts) },
    { name: 'session-count', plan: buildSessionCountPlan(lifts) },
    { name: 'stalled-lifts', plan: buildStalledLiftsPlan(lifts) },
    { name: 'lighter-weight-progress', plan: buildLightWeightProgressPlan(lifts) },
    { name: 'top-weight-sets', plan: buildTopWeightSetsPlan(lifts) },
    { name: 'worst-day-volume', plan: buildWorstDayVolumePlan(lifts) },
    { name: 'favorite-split-day', plan: buildFavoriteSplitDayPlan(lifts) },
    { name: 'weekly-volume', plan: buildWeeklyVolumePlan(lifts) },
    { name: 'top-end-efforts', plan: buildTopEndEffortsPlan(lifts) },
    { name: 'top-end-efforts-compare', plan: buildTopEndEffortsComparisonPlan(lifts) },
    {
      name: 'workout-plan-quads',
      plan: buildWorkoutPlanQueries({
        lifts,
        constraint: { include: ['quads'], strict: true },
        window: '12 months',
        maxExercises: 5,
      }),
    },
    { name: 'muscle-group-body-parts', plan: buildMuscleGroupComparisonPlan(true, lifts) },
    { name: 'muscle-group-fallback', plan: buildMuscleGroupComparisonPlan(false, lifts) },
  ]

  plans.forEach(({ name, plan }) => {
    plan.queries.forEach(query => {
      const label = `${name}:${query.id}`
      assert.ok(query.sql.toLowerCase().startsWith('with sets as ('), `${label}: missing sets CTE`)
      assertNoAliasLeaks(query.sql, label)
      assertTypedCoalesce(query.sql, label)
      assertIntervalParamsUsed(query.sql, query.params, label)
    })
  })

  console.log('gym-chat canonical SQL checks passed.')
}

run()
