const SEMANTIC_MAPPINGS = [
  {
    phrase: 'volume',
    sql: 'SUM(weight * reps)',
  },
  {
    phrase: 'weekly sets',
    sql: "COUNT(*) grouped by DATE_TRUNC('week', date)",
  },
  {
    phrase: 'sessions',
    sql: 'COUNT(DISTINCT date::date)',
  },
  {
    phrase: 'estimated 1RM',
    sql: 'ROUND(weight * (1 + reps / 30.0))',
  },
  {
    phrase: 'PR',
    sql: 'MAX(weight) unless phrasing explicitly calls for estimated 1RM',
  },
  {
    phrase: 'push day / pull day / leg day',
    sql: "day_tag ILIKE 'push%' / 'pull%' / 'leg%'",
  },
  {
    phrase: 'body parts',
    sql: "Use gym_day_meta.body_parts (text array). Filter with EXISTS (SELECT 1 FROM unnest(body_parts) AS bp WHERE bp ILIKE $1) or body_parts @> ARRAY[$1::text]. For top body part, use UNNEST(body_parts) AS body_part and COUNT(*) grouped by body_part.",
  },
  {
    phrase: 'body part exercises',
    sql: "Use a sets CTE (normalized dates). Join gym_day_meta gm ON gm.date = sets.session_date. Use EXISTS (SELECT 1 FROM unnest(gm.body_parts) AS bp WHERE bp ILIKE $1) to filter gm rows. Then GROUP BY exercise to sum volume (weight*reps) for the requested body_part.",
  },
  {
    phrase: 'top sets by body part',
    sql: "Use a sets CTE. Join gym_day_meta gm ON gm.date = sets.session_date, UNNEST(gm.body_parts) AS body_part, then rank sets by weight with ROW_NUMBER() OVER (PARTITION BY body_part ORDER BY weight DESC). Filter to row_number = 1 per body_part, then ORDER BY weight DESC LIMIT N.",
  },
  {
    phrase: 'weekly muscle group volume comparison',
    sql:
      "WITH sets AS (SELECT exercise, weight, reps, COALESCE(date::date, timestamp::date) AS session_date, COALESCE(timestamp::timestamptz, date::timestamptz) AS performed_at FROM gym_lifts), base AS (SELECT DATE_TRUNC('week', performed_at)::date AS week_start, UNNEST(gm.body_parts) AS body_part, SUM(weight * reps) AS volume FROM sets JOIN gym_day_meta gm ON gm.date = sets.session_date WHERE performed_at >= CURRENT_DATE - ($1)::interval GROUP BY week_start, body_part), recent AS (SELECT body_part, AVG(volume) AS avg_recent FROM base WHERE week_start >= CURRENT_DATE - ($2)::interval GROUP BY body_part), prior AS (SELECT body_part, AVG(volume) AS avg_prior FROM base WHERE week_start < CURRENT_DATE - ($2)::interval AND week_start >= CURRENT_DATE - ($3)::interval GROUP BY body_part) SELECT COALESCE(recent.body_part, prior.body_part) AS body_part, avg_recent, avg_prior, CASE WHEN avg_prior IS NULL OR avg_prior = 0 THEN NULL ELSE (avg_recent - avg_prior) / avg_prior END AS pct_change, CASE WHEN avg_prior IS NULL OR avg_prior = 0 THEN false ELSE ABS((avg_recent - avg_prior) / avg_prior) >= 0.15 END AS flagged FROM recent FULL JOIN prior ON recent.body_part = prior.body_part ORDER BY pct_change DESC NULLS LAST.",
  },
  {
    phrase: 'progressive overload streak',
    sql:
      "WITH sets AS (SELECT exercise, weight, reps, COALESCE(date::date, timestamp::date) AS session_date, COALESCE(timestamp::timestamptz, date::timestamptz) AS performed_at FROM gym_lifts), session_best AS (SELECT session_date, exercise, MAX(weight * (1 + reps / 30.0)) AS est_1rm FROM sets WHERE performed_at >= CURRENT_DATE - ($1)::interval GROUP BY session_date, exercise), deltas AS (SELECT session_date, exercise, est_1rm, LAG(est_1rm) OVER (PARTITION BY exercise ORDER BY session_date) AS prev_1rm, (est_1rm - LAG(est_1rm) OVER (PARTITION BY exercise ORDER BY session_date)) AS delta FROM session_best), streaks AS (SELECT session_date, exercise, est_1rm, prev_1rm, delta, CASE WHEN delta > 0 THEN 1 ELSE 0 END AS is_increase, SUM(CASE WHEN delta <= 0 OR delta IS NULL THEN 1 ELSE 0 END) OVER (PARTITION BY exercise ORDER BY session_date) AS break_id FROM deltas), streak_groups AS (SELECT exercise, break_id, MIN(CASE WHEN is_increase = 1 THEN session_date END) AS streak_start, MAX(CASE WHEN is_increase = 1 THEN session_date END) AS streak_end, SUM(CASE WHEN is_increase = 1 THEN 1 ELSE 0 END) AS streak_len FROM streaks GROUP BY exercise, break_id), breaks AS (SELECT exercise, break_id, MIN(session_date) AS break_date FROM streaks WHERE is_increase = 0 GROUP BY exercise, break_id) SELECT g.exercise, g.streak_len, g.streak_start, g.streak_end, b.break_date FROM streak_groups g LEFT JOIN breaks b ON b.exercise = g.exercise AND b.break_id = g.break_id + 1 ORDER BY g.streak_len DESC NULLS LAST LIMIT 1.",
  },
] as const

export const SEMANTIC_HINTS = SEMANTIC_MAPPINGS
  .map(({ phrase, sql }) => `- ${phrase} => ${sql}`)
  .join('\n')
