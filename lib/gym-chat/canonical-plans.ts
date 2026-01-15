import type { SetsBaseCte } from './sql-builders'

export type CanonicalPlan = {
  queries: Array<{
    id: string
    purpose: string
    sql: string
    params: unknown[]
  }>
}

type SetFilterOptions = {
  window?: string
  exercise?: string | null
  allTime?: boolean
}

const buildSetsFilter = (lifts: SetsBaseCte, options?: SetFilterOptions) => {
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1
  if (!options?.allTime) {
    const window = options?.window ?? '90 days'
    params.push(window)
    conditions.push(`${lifts.performedAtExpr} >= CURRENT_DATE - ($${paramIndex})::interval`)
    paramIndex += 1
  }
  if (options?.exercise) {
    params.push(`%${options.exercise}%`)
    conditions.push(`${lifts.alias}.exercise ILIKE $${paramIndex}`)
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const policyHint = options?.allTime ? '/*policy:time_window=all_time*/ ' : ''
  return { whereClause, params, policyHint }
}

export const buildTopWeightSetsPlan = (
  lifts: SetsBaseCte,
  options?: { limit?: number; window?: string },
): CanonicalPlan => {
  const limit = options?.limit && options.limit > 0 ? Math.floor(options.limit) : 5
  const window = options?.window ?? '90 days'
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Retrieve the top ${limit} highest-weight sets over the last ${window}.`,
        sql:
          `WITH ${lifts.cte} ` +
          'SELECT ' +
          `${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
          `${lifts.alias}.weight, ${lifts.alias}.reps ` +
          `FROM ${lifts.alias} ` +
          `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
          `ORDER BY ${lifts.alias}.weight DESC NULLS LAST, ${lifts.alias}.reps DESC NULLS LAST ` +
          `LIMIT ${limit}`,
        params: [window],
      },
    ],
  }
}

export const buildExercisePrsPlan = (
  lifts: SetsBaseCte,
  options?: {
    limit?: number
    window?: string
    exercise?: string | null
    useEstimated1rm?: boolean
    allTime?: boolean
  },
): CanonicalPlan => {
  const limit = options?.limit && options.limit > 0 ? Math.floor(options.limit) : 10
  const window = options?.window ?? '90 days'
  const useEstimated1rm = options?.useEstimated1rm ?? false
  const windowLabel = options?.allTime ? 'all time' : `the last ${window}`
  const metricLabel = useEstimated1rm ? 'estimated 1RM' : 'weight'
  const filter = buildSetsFilter(lifts, {
    window,
    exercise: options?.exercise ?? null,
    allTime: options?.allTime,
  })
  const metricExpr = useEstimated1rm ? lifts.est1rmExpr : `${lifts.alias}.weight`
  return {
    queries: [
      {
        id: 'q1',
        purpose: `List ${metricLabel} PRs by exercise over ${windowLabel}.`,
        sql:
          `${filter.policyHint}WITH ${lifts.cte}, ranked AS (` +
          `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
          `${lifts.alias}.weight, ${lifts.alias}.reps, ${lifts.est1rmExpr} AS est_1rm, ` +
          `${metricExpr} AS metric_value, ` +
          `ROW_NUMBER() OVER (PARTITION BY ${lifts.alias}.exercise ` +
          `ORDER BY ${metricExpr} DESC NULLS LAST, ${lifts.performedAtExpr} DESC NULLS LAST) AS rn ` +
          `FROM ${lifts.alias} ` +
          `${filter.whereClause}` +
          ') ' +
          'SELECT exercise, metric_value AS pr_value, weight, reps, est_1rm, session_date ' +
          'FROM ranked ' +
          'WHERE rn = 1 ' +
          'ORDER BY pr_value DESC NULLS LAST ' +
          `LIMIT ${limit}`,
        params: filter.params,
      },
    ],
  }
}

export const buildBestSetsPlan = (
  lifts: SetsBaseCte,
  options?: {
    limit?: number
    window?: string
    exercise?: string | null
    useEstimated1rm?: boolean
    allTime?: boolean
  },
): CanonicalPlan => {
  const limit = options?.limit && options.limit > 0 ? Math.floor(options.limit) : 5
  const window = options?.window ?? '90 days'
  const useEstimated1rm = options?.useEstimated1rm ?? false
  const windowLabel = options?.allTime ? 'all time' : `the last ${window}`
  const metricLabel = useEstimated1rm ? 'estimated 1RM' : 'weight'
  const filter = buildSetsFilter(lifts, {
    window,
    exercise: options?.exercise ?? null,
    allTime: options?.allTime,
  })
  const metricExpr = useEstimated1rm ? lifts.est1rmExpr : `${lifts.alias}.weight`
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Retrieve the best ${metricLabel} sets over ${windowLabel}.`,
        sql:
          `${filter.policyHint}WITH ${lifts.cte} ` +
          'SELECT ' +
          `${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
          `${lifts.alias}.weight, ${lifts.alias}.reps, ${lifts.est1rmExpr} AS est_1rm, ` +
          `${metricExpr} AS metric_value ` +
          `FROM ${lifts.alias} ` +
          `${filter.whereClause} ` +
          'ORDER BY metric_value DESC NULLS LAST, ' +
          `${lifts.performedAtExpr} DESC NULLS LAST ` +
          `LIMIT ${limit}`,
        params: filter.params,
      },
    ],
  }
}

export const buildExerciseSummaryPlan = (
  lifts: SetsBaseCte,
  options?: { limit?: number; window?: string; exercise?: string | null; allTime?: boolean },
): CanonicalPlan => {
  const limit = options?.limit && options.limit > 0 ? Math.floor(options.limit) : 10
  const window = options?.window ?? '90 days'
  const windowLabel = options?.allTime ? 'all time' : `the last ${window}`
  const filter = buildSetsFilter(lifts, {
    window,
    exercise: options?.exercise ?? null,
    allTime: options?.allTime,
  })
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Summarize per-exercise training history over ${windowLabel}.`,
        sql:
          `${filter.policyHint}WITH ${lifts.cte}, filtered AS (` +
          `SELECT ${lifts.alias}.exercise, ${lifts.alias}.weight, ${lifts.alias}.reps, ` +
          `${lifts.est1rmExpr} AS est_1rm, ${lifts.volumeExpr} AS volume, ` +
          `${lifts.sessionDateExpr} AS session_date, ${lifts.performedAtExpr} AS performed_at ` +
          `FROM ${lifts.alias} ` +
          `${filter.whereClause}` +
          '), summary AS (' +
          'SELECT exercise, COUNT(*) AS total_sets, SUM(volume) AS total_volume, ' +
          'MAX(session_date) AS last_performed_date ' +
          'FROM filtered GROUP BY exercise' +
          '), best_set AS (' +
          'SELECT exercise, weight, reps, session_date, est_1rm, ' +
          'ROW_NUMBER() OVER (PARTITION BY exercise ' +
          'ORDER BY weight DESC NULLS LAST, reps DESC NULLS LAST, performed_at DESC NULLS LAST) AS rn ' +
          'FROM filtered' +
          ') ' +
          'SELECT s.exercise, s.total_sets, s.total_volume, s.last_performed_date, ' +
          'b.weight AS best_weight, b.reps AS best_reps, b.session_date AS best_date, b.est_1rm AS best_est_1rm ' +
          'FROM summary s ' +
          'LEFT JOIN best_set b ON b.exercise = s.exercise AND b.rn = 1 ' +
          'ORDER BY s.total_volume DESC NULLS LAST ' +
          `LIMIT ${limit}`,
        params: filter.params,
      },
    ],
  }
}

export const buildExerciseProgressionPlan = (
  lifts: SetsBaseCte,
  options?: {
    window?: string
    exercise?: string | null
    bucket?: 'week' | 'month'
    allTime?: boolean
  },
): CanonicalPlan => {
  const window = options?.window ?? '12 months'
  const bucket = options?.bucket === 'month' ? 'month' : 'week'
  const bucketLabel = bucket === 'month' ? 'monthly' : 'weekly'
  const windowLabel = options?.allTime ? 'all time' : `the last ${window}`
  const filter = buildSetsFilter(lifts, {
    window,
    exercise: options?.exercise ?? null,
    allTime: options?.allTime,
  })
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Track ${bucketLabel} estimated 1RM progression by exercise over ${windowLabel}.`,
        sql:
          `${filter.policyHint}WITH ${lifts.cte}, session_best AS (` +
          `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
          `MAX(${lifts.est1rmExpr}) AS est_1rm ` +
          `FROM ${lifts.alias} ` +
          `${filter.whereClause} ` +
          `GROUP BY session_date, ${lifts.alias}.exercise` +
          '), aggregated AS (' +
          `SELECT DATE_TRUNC('${bucket}', session_date::timestamp)::date AS period_start, ` +
          'exercise, AVG(est_1rm) AS avg_est_1rm ' +
          'FROM session_best ' +
          'GROUP BY period_start, exercise' +
          ') ' +
          'SELECT exercise, period_start, avg_est_1rm ' +
          'FROM aggregated ' +
          'ORDER BY exercise, period_start',
        params: filter.params,
      },
    ],
  }
}

export const buildReturnEffortVolumePlan = (
  lifts: SetsBaseCte,
  options?: { window?: string; limit?: number },
): CanonicalPlan => {
  const window = options?.window ?? '90 days'
  const limit = options?.limit && options.limit > 0 ? Math.floor(options.limit) : 50
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Summarize total volume per exercise over the last ${window}.`,
        sql:
          `WITH ${lifts.cte}, volume AS (` +
          `SELECT ${lifts.alias}.exercise, SUM(${lifts.volumeExpr}) AS total_volume ` +
          `FROM ${lifts.alias} ` +
          `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
          `GROUP BY ${lifts.alias}.exercise` +
          ') ' +
          'SELECT exercise, total_volume ' +
          'FROM volume ' +
          'ORDER BY total_volume DESC NULLS LAST ' +
          `LIMIT ${limit}`,
        params: [window],
      },
    ],
  }
}

export const buildSetCountPlan = (
  lifts: SetsBaseCte,
  options?: { window?: string; limit?: number },
): CanonicalPlan => {
  const window = options?.window ?? '90 days'
  const limit = options?.limit && options.limit > 0 ? Math.floor(options.limit) : 10
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Rank exercises by total sets over the last ${window}.`,
        sql:
          `WITH ${lifts.cte}, counts AS (` +
          `SELECT ${lifts.alias}.exercise, COUNT(*) AS total_sets ` +
          `FROM ${lifts.alias} ` +
          `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
          `GROUP BY ${lifts.alias}.exercise` +
          ') ' +
          'SELECT exercise, total_sets ' +
          'FROM counts ' +
          'ORDER BY total_sets DESC NULLS LAST ' +
          `LIMIT ${limit}`,
        params: [window],
      },
    ],
  }
}

export const buildVolumeRankingPlan = (
  lifts: SetsBaseCte,
  options?: { window?: string; limit?: number },
): CanonicalPlan => {
  const window = options?.window ?? '90 days'
  const limit = options?.limit && options.limit > 0 ? Math.floor(options.limit) : 10
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Rank exercises by total volume over the last ${window}.`,
        sql:
          `WITH ${lifts.cte}, volume AS (` +
          `SELECT ${lifts.alias}.exercise, SUM(${lifts.volumeExpr}) AS total_volume ` +
          `FROM ${lifts.alias} ` +
          `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
          `GROUP BY ${lifts.alias}.exercise` +
          ') ' +
          'SELECT exercise, total_volume ' +
          'FROM volume ' +
          'ORDER BY total_volume DESC NULLS LAST ' +
          `LIMIT ${limit}`,
        params: [window],
      },
    ],
  }
}

export const buildSessionCountPlan = (lifts: SetsBaseCte, options?: { window?: string }): CanonicalPlan => {
  const window = options?.window ?? '12 weeks'
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Count distinct training sessions over the last ${window}.`,
        sql:
          `WITH ${lifts.cte} ` +
          'SELECT COUNT(DISTINCT session_date) AS session_count ' +
          `FROM ${lifts.alias} ` +
          `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval`,
        params: [window],
      },
    ],
  }
}

export const buildWorstDayVolumePlan = (
  lifts: SetsBaseCte,
  options?: { window?: string },
): CanonicalPlan => {
  const window = options?.window ?? '30 days'
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Identify the session with the lowest total volume over the last ${window}.`,
        sql:
          `WITH ${lifts.cte}, daily AS (` +
          `SELECT ${lifts.sessionDateExpr} AS session_date, ` +
          `SUM(${lifts.volumeExpr}) AS total_volume, ` +
          `COUNT(*) AS total_sets ` +
          `FROM ${lifts.alias} ` +
          `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
          'GROUP BY session_date' +
          ') ' +
          'SELECT session_date, total_volume, total_sets ' +
          'FROM daily ' +
          'ORDER BY total_volume ASC NULLS LAST ' +
          'LIMIT 1',
        params: [window],
      },
    ],
  }
}

export const buildWeeklyVolumePlan = (
  lifts: SetsBaseCte,
  options?: { window?: string },
): CanonicalPlan => {
  const window = options?.window ?? '12 months'
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Calculate weekly training volume over the last ${window}.`,
        sql:
          `WITH ${lifts.cte}, weekly AS (` +
          `SELECT DATE_TRUNC('week', ${lifts.performedAtExpr})::date AS week_start, ` +
          `SUM(${lifts.volumeExpr}) AS total_volume, ` +
          `COUNT(*) AS total_sets ` +
          `FROM ${lifts.alias} ` +
          `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
          'GROUP BY week_start' +
          ') ' +
          'SELECT week_start, total_volume, total_sets ' +
          'FROM weekly ' +
          'ORDER BY week_start',
        params: [window],
      },
    ],
  }
}

export const buildFavoriteSplitDayPlan = (
  lifts: SetsBaseCte,
  options?: { window?: string; limit?: number },
): CanonicalPlan => {
  const window = options?.window ?? '12 months'
  const limit = options?.limit && options.limit > 0 ? Math.floor(options.limit) : 3
  const dayTagExpr = lifts.dayTagExpr
  const sessionSource = dayTagExpr
    ? `SELECT ${lifts.sessionDateExpr} AS session_date, ${dayTagExpr} AS day_tag ` +
      `FROM ${lifts.alias} ` +
      `WHERE ${dayTagExpr} IS NOT NULL AND ${dayTagExpr} <> '' ` +
      `AND ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
      'GROUP BY session_date, day_tag'
    : `SELECT ${lifts.sessionDateExpr} AS session_date, gm.day_tag AS day_tag ` +
      `FROM ${lifts.alias} ` +
      `JOIN gym_day_meta gm ON gm.date = ${lifts.sessionDateExpr} ` +
      `WHERE gm.day_tag IS NOT NULL AND gm.day_tag <> '' ` +
      `AND ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
      'GROUP BY session_date, gm.day_tag'
  return {
    queries: [
      {
        id: 'q1',
        purpose: `Find the most frequent split day (day_tag) by session count over the last ${window}.`,
        sql:
          `WITH ${lifts.cte}, sessions AS (` +
          sessionSource +
          ') ' +
          'SELECT day_tag, COUNT(*) AS session_count ' +
          'FROM sessions ' +
          'GROUP BY day_tag ' +
          'ORDER BY session_count DESC ' +
          `LIMIT ${limit}`,
        params: [window],
      },
    ],
  }
}

export const buildProgressiveOverloadPlan = (lifts: SetsBaseCte): CanonicalPlan => ({
  queries: [
    {
      id: 'q1',
      purpose: 'Identify the longest continuous progressive overload streak using estimated 1RM per session.',
      sql:
        `WITH ${lifts.cte}, session_best AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `MAX(${lifts.est1rmExpr}) AS est_1rm ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
        `GROUP BY session_date, ${lifts.alias}.exercise` +
        '), deltas AS (' +
        'SELECT session_date, exercise, est_1rm, ' +
        'LAG(est_1rm) OVER (PARTITION BY exercise ORDER BY session_date) AS prev_1rm, ' +
        '(est_1rm - LAG(est_1rm) OVER (PARTITION BY exercise ORDER BY session_date)) AS delta ' +
        'FROM session_best' +
        '), streaks AS (' +
        'SELECT session_date, exercise, est_1rm, prev_1rm, delta, ' +
        'CASE WHEN delta > 0 THEN 1 ELSE 0 END AS is_increase, ' +
        'SUM(CASE WHEN delta <= 0 OR delta IS NULL THEN 1 ELSE 0 END) ' +
        'OVER (PARTITION BY exercise ORDER BY session_date) AS break_id ' +
        'FROM deltas' +
        '), streak_groups AS (' +
        'SELECT exercise, break_id, ' +
        'MIN(CASE WHEN is_increase = 1 THEN session_date END) AS streak_start, ' +
        'MAX(CASE WHEN is_increase = 1 THEN session_date END) AS streak_end, ' +
        'SUM(CASE WHEN is_increase = 1 THEN 1 ELSE 0 END) AS streak_len ' +
        'FROM streaks ' +
        'GROUP BY exercise, break_id' +
        '), breaks AS (' +
        'SELECT exercise, break_id, MIN(session_date) AS break_date ' +
        'FROM streaks ' +
        'WHERE is_increase = 0 ' +
        'GROUP BY exercise, break_id' +
        ') ' +
        'SELECT g.exercise, g.streak_len, g.streak_start, g.streak_end, b.break_date ' +
        'FROM streak_groups g ' +
        'LEFT JOIN breaks b ON b.exercise = g.exercise AND b.break_id = g.break_id + 1 ' +
        'ORDER BY g.streak_len DESC NULLS LAST ' +
        'LIMIT 1',
      params: ['12 months'],
    },
  ],
})

export const buildMuscleGroupComparisonPlan = (useBodyParts: boolean, lifts: SetsBaseCte): CanonicalPlan => {
  if (!useBodyParts) {
    return {
      queries: [
        {
          id: 'q1',
          purpose: 'Fallback: compare average weekly volume by exercise as a proxy for body-part balance.',
          sql:
            `WITH ${lifts.cte}, base AS (` +
            `SELECT DATE_TRUNC('week', ${lifts.performedAtExpr})::date AS week_start, ` +
            `${lifts.alias}.exercise, SUM(${lifts.volumeExpr}) AS volume ` +
            `FROM ${lifts.alias} ` +
            `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
            `GROUP BY week_start, ${lifts.alias}.exercise` +
            '), recent AS (' +
            'SELECT exercise, AVG(volume) AS avg_recent ' +
            'FROM base WHERE week_start >= CURRENT_DATE - ($2)::interval ' +
            'GROUP BY exercise' +
            '), prior AS (' +
            'SELECT exercise, AVG(volume) AS avg_prior ' +
            'FROM base WHERE week_start < CURRENT_DATE - ($2)::interval ' +
            'AND week_start >= CURRENT_DATE - ($3)::interval ' +
            'GROUP BY exercise' +
            ') ' +
            'SELECT COALESCE(recent.exercise, prior.exercise) AS exercise, ' +
            'avg_recent, avg_prior, ' +
            'CASE WHEN avg_prior IS NULL OR avg_prior = 0 THEN NULL ELSE (avg_recent - avg_prior) / avg_prior END AS pct_change, ' +
            'CASE WHEN avg_prior IS NULL OR avg_prior = 0 THEN false ELSE ABS((avg_recent - avg_prior) / avg_prior) >= 0.15 END AS flagged ' +
            'FROM recent FULL JOIN prior ON recent.exercise = prior.exercise ' +
            'ORDER BY pct_change DESC NULLS LAST',
          params: ['24 weeks', '12 weeks', '24 weeks'],
        },
      ],
    }
  }
  return {
    queries: [
      {
        id: 'q1',
        purpose: 'Compare average weekly volume by body part over recent vs prior 12 weeks.',
        sql:
          `WITH ${lifts.cte}, base AS (` +
          `SELECT DATE_TRUNC('week', ${lifts.performedAtExpr})::date AS week_start, bp.body_part, ` +
          `SUM(${lifts.volumeExpr}) AS volume ` +
          `FROM ${lifts.alias} ` +
          `JOIN gym_day_meta gm ON gm.date = ${lifts.sessionDateExpr} ` +
          'CROSS JOIN LATERAL UNNEST(gm.body_parts) AS bp(body_part) ' +
          `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
          'GROUP BY week_start, bp.body_part' +
          '), recent AS (' +
          'SELECT body_part, AVG(volume) AS avg_recent ' +
          'FROM base WHERE week_start >= CURRENT_DATE - ($2)::interval ' +
          'GROUP BY body_part' +
          '), prior AS (' +
          'SELECT body_part, AVG(volume) AS avg_prior ' +
          'FROM base WHERE week_start < CURRENT_DATE - ($2)::interval ' +
          'AND week_start >= CURRENT_DATE - ($3)::interval ' +
          'GROUP BY body_part' +
          ') ' +
          'SELECT COALESCE(recent.body_part, prior.body_part) AS body_part, ' +
          'avg_recent, avg_prior, ' +
          'CASE WHEN avg_prior IS NULL OR avg_prior = 0 THEN NULL ELSE (avg_recent - avg_prior) / avg_prior END AS pct_change, ' +
          'CASE WHEN avg_prior IS NULL OR avg_prior = 0 THEN false ELSE ABS((avg_recent - avg_prior) / avg_prior) >= 0.15 END AS flagged ' +
          'FROM recent FULL JOIN prior ON recent.body_part = prior.body_part ' +
          'ORDER BY pct_change DESC NULLS LAST',
        params: ['24 weeks', '12 weeks', '24 weeks'],
      },
    ],
  }
}

export const buildTopEndEffortsPlan = (lifts: SetsBaseCte): CanonicalPlan => ({
  queries: [
    {
      id: 'q1',
      purpose: 'Identify top-end sets per exercise (top 3 weights) over the last 12 months.',
      sql:
        `WITH ${lifts.cte}, ranked AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `${lifts.alias}.weight, ${lifts.alias}.reps, ` +
        `ROW_NUMBER() OVER (PARTITION BY ${lifts.alias}.exercise ORDER BY ${lifts.alias}.weight DESC) AS rn ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval` +
        '), top_end AS (' +
        'SELECT session_date, exercise, weight, reps ' +
        'FROM ranked WHERE rn <= 3' +
        ') ' +
        'SELECT exercise, COUNT(*) AS top_sets, COUNT(DISTINCT session_date) AS sessions_with_top_sets, ' +
        'MAX(weight) AS heaviest_set ' +
        'FROM top_end ' +
        'GROUP BY exercise ' +
        'ORDER BY top_sets DESC, heaviest_set DESC',
      params: ['12 months'],
    },
    {
      id: 'q2',
      purpose: 'Count sessions that include any top-end set in the last 12 months.',
      sql:
        `WITH ${lifts.cte}, ranked AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `${lifts.alias}.weight, ${lifts.alias}.reps, ` +
        `ROW_NUMBER() OVER (PARTITION BY ${lifts.alias}.exercise ORDER BY ${lifts.alias}.weight DESC) AS rn ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval` +
        '), top_end AS (' +
        'SELECT session_date FROM ranked WHERE rn <= 3' +
        ') ' +
        'SELECT ' +
        'COUNT(DISTINCT session_date) AS sessions_with_top_end, ' +
        `(SELECT COUNT(DISTINCT ${lifts.sessionDateExpr}) FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval) ` +
        'AS total_sessions ' +
        'FROM top_end',
      params: ['12 months'],
    },
  ],
})

export const buildTopEndEffortsComparisonPlan = (lifts: SetsBaseCte): CanonicalPlan => ({
  queries: [
    {
      id: 'q1',
      purpose: 'Identify top-end sets per exercise (top 3 weights) over the last 12 months.',
      sql:
        `WITH ${lifts.cte}, ranked AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `${lifts.alias}.weight, ${lifts.alias}.reps, ` +
        `ROW_NUMBER() OVER (PARTITION BY ${lifts.alias}.exercise ORDER BY ${lifts.alias}.weight DESC) AS rn ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval` +
        '), top_end AS (' +
        'SELECT session_date, exercise, weight, reps ' +
        'FROM ranked WHERE rn <= 3' +
        ') ' +
        'SELECT exercise, COUNT(*) AS top_sets, COUNT(DISTINCT session_date) AS sessions_with_top_sets, ' +
        'MAX(weight) AS heaviest_set ' +
        'FROM top_end ' +
        'GROUP BY exercise ' +
        'ORDER BY top_sets DESC, heaviest_set DESC',
      params: ['12 months'],
    },
    {
      id: 'q2',
      purpose: 'Count sessions that include any top-end set in the last 12 months.',
      sql:
        `WITH ${lifts.cte}, ranked AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `${lifts.alias}.weight, ${lifts.alias}.reps, ` +
        `ROW_NUMBER() OVER (PARTITION BY ${lifts.alias}.exercise ORDER BY ${lifts.alias}.weight DESC) AS rn ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval` +
        '), top_end AS (' +
        'SELECT session_date FROM ranked WHERE rn <= 3' +
        ') ' +
        'SELECT ' +
        'COUNT(DISTINCT session_date) AS sessions_with_top_end, ' +
        `(SELECT COUNT(DISTINCT ${lifts.sessionDateExpr}) FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval) ` +
        'AS total_sessions ' +
        'FROM top_end',
      params: ['12 months'],
    },
    {
      id: 'q3',
      purpose: 'Identify top-end sets per exercise (top 3 weights) over the last 3 months.',
      sql:
        `WITH ${lifts.cte}, ranked AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `${lifts.alias}.weight, ${lifts.alias}.reps, ` +
        `ROW_NUMBER() OVER (PARTITION BY ${lifts.alias}.exercise ORDER BY ${lifts.alias}.weight DESC) AS rn ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval` +
        '), top_end AS (' +
        'SELECT session_date, exercise, weight, reps ' +
        'FROM ranked WHERE rn <= 3' +
        ') ' +
        'SELECT exercise, COUNT(*) AS top_sets, COUNT(DISTINCT session_date) AS sessions_with_top_sets, ' +
        'MAX(weight) AS heaviest_set ' +
        'FROM top_end ' +
        'GROUP BY exercise ' +
        'ORDER BY top_sets DESC, heaviest_set DESC',
      params: ['3 months'],
    },
    {
      id: 'q4',
      purpose: 'Count sessions that include any top-end set in the last 3 months.',
      sql:
        `WITH ${lifts.cte}, ranked AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `${lifts.alias}.weight, ${lifts.alias}.reps, ` +
        `ROW_NUMBER() OVER (PARTITION BY ${lifts.alias}.exercise ORDER BY ${lifts.alias}.weight DESC) AS rn ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval` +
        '), top_end AS (' +
        'SELECT session_date FROM ranked WHERE rn <= 3' +
        ') ' +
        'SELECT ' +
        'COUNT(DISTINCT session_date) AS sessions_with_top_end, ' +
        `(SELECT COUNT(DISTINCT ${lifts.sessionDateExpr}) FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval) ` +
        'AS total_sessions ' +
        'FROM top_end',
      params: ['3 months'],
    },
  ],
})

export const buildReturnEffortProgressionPlan = (lifts: SetsBaseCte): CanonicalPlan => ({
  queries: [
    {
      id: 'q1',
      purpose: 'Track estimated 1RM progression by exercise (weekly) over the last 12 months.',
      sql:
        `WITH ${lifts.cte}, session_best AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `MAX(${lifts.est1rmExpr}) AS est_1rm ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
        `GROUP BY session_date, ${lifts.alias}.exercise` +
        '), weekly AS (' +
        'SELECT DATE_TRUNC(\'week\', session_date::timestamp)::date AS week_start, ' +
        'exercise, AVG(est_1rm) AS avg_est_1rm ' +
        'FROM session_best ' +
        'GROUP BY week_start, exercise' +
        ') ' +
        'SELECT exercise, week_start, avg_est_1rm ' +
        'FROM weekly ' +
        'ORDER BY exercise, week_start',
      params: ['12 months'],
    },
  ],
})

export const buildStalledLiftsPlan = (lifts: SetsBaseCte): CanonicalPlan => ({
  queries: [
    {
      id: 'q1',
      purpose: 'Identify stalled lifts by calculating days since the last estimated 1RM improvement (last 12 months).',
      sql:
        `WITH ${lifts.cte}, session_best AS (` +
        `SELECT ${lifts.sessionDateExpr} AS session_date, ${lifts.alias}.exercise, ` +
        `MAX(${lifts.est1rmExpr}) AS est_1rm ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
        `GROUP BY session_date, ${lifts.alias}.exercise` +
        '), progress AS (' +
        'SELECT session_date, exercise, est_1rm, ' +
        'MAX(est_1rm) OVER (PARTITION BY exercise ORDER BY session_date) AS running_max ' +
        'FROM session_best' +
        '), milestones AS (' +
        'SELECT session_date, exercise, est_1rm, ' +
        'LAG(running_max) OVER (PARTITION BY exercise ORDER BY session_date) AS prev_max, ' +
        'running_max ' +
        'FROM progress' +
        '), last_pr AS (' +
        'SELECT exercise, ' +
        'MAX(CASE WHEN prev_max IS NULL OR running_max > prev_max THEN session_date END) AS last_pr_date, ' +
        'MAX(running_max) AS best_est_1rm, ' +
        'COUNT(*) AS session_count ' +
        'FROM milestones ' +
        'GROUP BY exercise' +
        ') ' +
        'SELECT exercise, best_est_1rm, last_pr_date, ' +
        '(CURRENT_DATE - last_pr_date) AS days_since_pr, session_count ' +
        'FROM last_pr ' +
        'WHERE last_pr_date IS NOT NULL AND session_count >= 3 ' +
        'ORDER BY days_since_pr DESC NULLS LAST ' +
        'LIMIT 50',
      params: ['12 months'],
    },
  ],
})

export const buildLightWeightProgressPlan = (lifts: SetsBaseCte): CanonicalPlan => ({
  queries: [
    {
      id: 'q1',
      purpose:
        'Identify exercises where estimated 1RM improved while average working weight decreased (recent 6 months vs prior 6 months).',
      sql:
        `WITH ${lifts.cte}, base AS (` +
        `SELECT ${lifts.alias}.exercise, ${lifts.performedAtExpr} AS performed_at, ` +
        `${lifts.alias}.weight, ${lifts.alias}.reps, ${lifts.est1rmExpr} AS est_1rm ` +
        `FROM ${lifts.alias} ` +
        `WHERE ${lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval` +
        '), recent AS (' +
        'SELECT exercise, AVG(weight) AS avg_weight_recent, AVG(est_1rm) AS avg_1rm_recent ' +
        'FROM base WHERE performed_at >= CURRENT_DATE - ($2)::interval ' +
        'GROUP BY exercise' +
        '), prior AS (' +
        'SELECT exercise, AVG(weight) AS avg_weight_prior, AVG(est_1rm) AS avg_1rm_prior ' +
        'FROM base WHERE performed_at < CURRENT_DATE - ($2)::interval ' +
        'AND performed_at >= CURRENT_DATE - ($3)::interval ' +
        'GROUP BY exercise' +
        ') ' +
        'SELECT recent.exercise, avg_weight_recent, avg_weight_prior, avg_1rm_recent, avg_1rm_prior, ' +
        '(avg_weight_recent - avg_weight_prior) AS weight_delta, ' +
        '(avg_1rm_recent - avg_1rm_prior) AS est_1rm_delta ' +
        'FROM recent ' +
        'JOIN prior ON recent.exercise = prior.exercise ' +
        'WHERE avg_weight_recent < avg_weight_prior AND avg_1rm_recent > avg_1rm_prior ' +
        'ORDER BY est_1rm_delta DESC NULLS LAST ' +
        'LIMIT 50',
      params: ['12 months', '6 months', '12 months'],
    },
  ],
})
