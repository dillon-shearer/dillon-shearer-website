type IntentType = 'descriptive' | 'trend' | 'comparison' | 'diagnostic' | 'planning'

export type GymChatTemplateName =
  | 'momentum_dropoff'
  | 'plateau_vs_progress'
  | 'workload_consistency'
  | 'body_part_balance'

export type GymChatTemplate = {
  name: GymChatTemplateName
  description: string
  intentTypeHints: IntentType[]
  keywordHints: string[]
  defaultTimeWindow: '90 days' | '12 months' | 'all_time'
  queryBlueprints: Array<{ role: string; mustMeasure: string }>
  explainChecklist: string[]
}

export const TEMPLATES: Record<GymChatTemplateName, GymChatTemplate> = {
  momentum_dropoff: {
    name: 'momentum_dropoff',
    description: 'Diagnose where performance drops within a workout and relate it to workload trends.',
    intentTypeHints: ['diagnostic', 'trend'],
    keywordHints: ['momentum', 'fatigue', 'drop off', 'drop-off', 'dropoff', 'fade', 'early sets', 'late sets'],
    defaultTimeWindow: '90 days',
    queryBlueprints: [
      {
        role: 'within_session_dropoff',
        mustMeasure:
          'Compare early vs late sets within the same sessions using set_number buckets, load, and reps.',
      },
      {
        role: 'session_momentum_trend',
        mustMeasure: 'Summarize per-session volume or intensity to spot sessions with the steepest drop-off.',
      },
      {
        role: 'workload_context',
        mustMeasure: 'Weekly or monthly workload totals to relate drop-off to overall fatigue trends.',
      },
    ],
    explainChecklist: [
      'State whether within-session drop-off exists and quantify it with citations.',
      'Describe the proxy used for set order (set_number buckets, early vs late thirds, etc.).',
      'Call out which sessions or exercises show the largest fade.',
      'Connect drop-off to broader workload trends if applicable.',
    ],
  },
  plateau_vs_progress: {
    name: 'plateau_vs_progress',
    description: 'Classify exercises as progressing, plateaued, or regressing based on recent trends.',
    intentTypeHints: ['comparison', 'diagnostic', 'planning'],
    keywordHints: ['plateau', 'stall', 'stalled', 'stagnate', 'stagnating', 'progress', 'regress', 'flat'],
    defaultTimeWindow: '12 months',
    queryBlueprints: [
      {
        role: 'exercise_trends',
        mustMeasure:
          'Per-exercise trend over time (load, reps, or estimated 1RM) with recent vs baseline comparison.',
      },
      {
        role: 'recent_performance',
        mustMeasure: 'Recent top sets or average working weight per exercise for anchor points.',
      },
    ],
    explainChecklist: [
      'Define the plateau/progress criteria used (e.g., slope threshold, recent vs baseline change).',
      'List exercises that are progressing vs plateauing with citations.',
      'Highlight any regressions or lifts that need attention.',
      'Translate the findings into next-focus suggestions when relevant.',
    ],
  },
  workload_consistency: {
    name: 'workload_consistency',
    description: 'Evaluate weekly/monthly workload consistency and gaps that affect planning.',
    intentTypeHints: ['trend', 'planning', 'diagnostic'],
    keywordHints: ['consistency', 'consistent', 'inconsistent', 'workload', 'volume', 'frequency', 'adherence'],
    defaultTimeWindow: '12 months',
    queryBlueprints: [
      {
        role: 'weekly_volume',
        mustMeasure: 'Weekly or monthly sets, reps, or tonnage to show volume stability.',
      },
      {
        role: 'variability',
        mustMeasure: 'Variance or range in workload to quantify volatility.',
      },
      {
        role: 'gaps',
        mustMeasure: 'Missed weeks or streaks without sessions to identify consistency gaps.',
      },
    ],
    explainChecklist: [
      'Summarize overall workload trend and variability with citations.',
      'Point out gaps or spikes and when they occurred.',
      'State what a stable baseline looks like for the user.',
      'Tie consistency findings to a concrete planning recommendation.',
    ],
  },
  body_part_balance: {
    name: 'body_part_balance',
    description: 'Compare workload across body parts to detect imbalances.',
    intentTypeHints: ['comparison', 'descriptive', 'planning'],
    keywordHints: ['balance', 'imbalanced', 'imbalance', 'body part', 'muscle', 'upper', 'lower', 'push', 'pull'],
    defaultTimeWindow: '90 days',
    queryBlueprints: [
      {
        role: 'body_part_volume',
        mustMeasure: 'Total sets, reps, or tonnage by body part over the time window.',
      },
      {
        role: 'body_part_trend',
        mustMeasure: 'Recent shifts in body part volume to catch emerging imbalances.',
      },
      {
        role: 'body_part_top_exercises',
        mustMeasure:
          'When asked which exercises drive a body part, join gym_day_meta on date, UNNEST(body_parts) AS body_part, filter to the requested body_part via params using EXISTS (SELECT 1 FROM unnest(body_parts) ...), and sum volume (weight * reps) per exercise over the requested window.',
      },
    ],
    explainChecklist: [
      'Call out the highest and lowest body-part volumes with citations.',
      'Quantify the balance gap (ratio or difference).',
      'Note any recent shifts in emphasis.',
      'Suggest where to redistribute workload if planning is requested.',
    ],
  },
}

type TemplateSelectionInput = {
  question: string
  intentType?: IntentType | string | null
  targets?: string[] | null
}

const normalizeText = (value: string) => value.toLowerCase()

const scoreTemplate = (
  template: GymChatTemplate,
  normalizedQuestion: string,
  intentType?: string,
  targets?: Set<string>,
) => {
  let score = 0
  if (intentType && template.intentTypeHints.includes(intentType as IntentType)) {
    score += 2
  }
  template.keywordHints.forEach(keyword => {
    if (normalizedQuestion.includes(keyword)) {
      score += 1
    }
  })
  if (template.name === 'body_part_balance' && targets?.has('body_part')) {
    score += 2
  }
  if (template.name === 'plateau_vs_progress' && targets?.has('exercise')) {
    score += 1
  }
  if (template.name === 'workload_consistency' && targets?.has('day_tag')) {
    score += 1
  }
  return score
}

export const selectTemplates = (input: TemplateSelectionInput): {
  primary: GymChatTemplateName
  secondary?: GymChatTemplateName
} => {
  const normalized = normalizeText(input.question || '')
  const intentType = input.intentType?.toLowerCase() ?? undefined
  const targets = new Set((input.targets ?? []).map(target => target.toLowerCase()))
  const scored = Object.values(TEMPLATES).map(template => ({
    template,
    score: scoreTemplate(template, normalized, intentType, targets),
  }))

  scored.sort((a, b) => b.score - a.score)

  const best = scored[0]
  const fallback = (() => {
    if (targets.has('body_part')) return 'body_part_balance'
    if (intentType === 'diagnostic') return 'momentum_dropoff'
    if (intentType === 'planning') return 'workload_consistency'
    if (intentType === 'comparison') return 'plateau_vs_progress'
    return 'workload_consistency'
  })()

  const primary = best && best.score > 0 ? best.template.name : fallback
  const second = scored.find(entry => entry.template.name !== primary && entry.score > 0)
  const secondary = second && second.score >= (best?.score ?? 0) - 1 ? second.template.name : undefined

  return {
    primary,
    secondary,
  }
}
