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
    sql: "Join gym_day_meta gm ON gm.date = gym_lifts.date. Use EXISTS (SELECT 1 FROM unnest(gm.body_parts) AS bp WHERE bp ILIKE $1) to filter gm rows. Then GROUP BY exercise to sum volume (weight*reps) for the requested body_part.",
  },
] as const

export const SEMANTIC_HINTS = SEMANTIC_MAPPINGS
  .map(({ phrase, sql }) => `- ${phrase} => ${sql}`)
  .join('\n')
