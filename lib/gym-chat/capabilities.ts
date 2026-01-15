const METRIC_GLOSSARY = `Metric glossary:
- session: a training day (distinct date) with at least one row in gym_lifts.
- set: a single logged set with exercise, weight, reps, and set_number.
- volume: SUM(weight * reps); unit corresponds to logged weight units (typically lb-reps).
- weekly volume: volume aggregated by DATE_TRUNC('week', date::date).
- monthly volume: volume aggregated by DATE_TRUNC('month', date::date).
- estimated 1RM: ROUND(weight * (1 + reps / 30.0)).
- PR: highest observed weight for an exercise unless the user explicitly asks for estimated 1RM.
- best set: heaviest set for an exercise (or highest estimated 1RM if requested).
- set-level fatigue: compare early vs late sets within a session using set_number buckets (thirds).
- per-exercise summary: total sets, total volume, last performed date, and best set per exercise.
- body_part exposure: use gym_day_meta.body_parts (text[]) via UNNEST(body_parts) AS body_part.
- split/day_tag: strings like push, pull, leg, upper, lower stored on each set via day_tag.
`

const DATA_SCOPE = `Data scope and limitations:
- Tables are prefixed gym_ in the public schema and are read-only.
- gym_lifts records every set with timestamps, exercise name, weight, reps, set_number, equipment, unilateral flag, and optional day_tag.
- gym_day_meta stores daily metadata: date, day_tag, body_parts (text[]), updated_at.
- There is no direct tracking of RPE, rest times, heart rate, subjective fatigue, injuries, or future plans.
- The agent may discuss goals and programming in general when logs are not required.
- When logs are absent for a claim, the agent must say so and use general best practices.
- The agent must state when a requested attribute does not exist and pivot to measurable proxies (sets, sessions, volume, rep ranges, body_parts, trends).
- For log-backed analysis, reasoning must stay within historical data; planning/future suggestions should be grounded in observed patterns.
`

const ANALYSIS_PATTERNS = `Helpful analysis patterns:
- Consistency: COUNT(DISTINCT date::date) per week/month or by weekday via EXTRACT(DOW).
- Period comparisons: compare recent vs prior windows for sessions/sets/volume; compute streaks, gaps, and missed weeks/months from session dates.
- Balance: compare body_part exposure or day_tag counts between recent windows and lifetime/all-time.
- Progression: track estimated 1RM or top weights per exercise over time.
- Within-session drop-off: bucket set_number into early/mid/late and compare average load/reps to quantify fatigue.
- Volume mix: break volume or set counts by exercise, day_tag, equipment, or rep band buckets (<=5, 6-8, 9-12, 13-15, 16+).
- Planning intent: identify under-trained areas, stalled lifts, or inconsistent days, then recommend focus areas using historical gaps.
`

export const getCapabilitiesContext = () => {
  return [METRIC_GLOSSARY.trim(), DATA_SCOPE.trim(), ANALYSIS_PATTERNS.trim()].join('\n\n')
}
