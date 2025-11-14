import type { GymDatasetSlug } from '@/types/data-access-portal';

export type GymDatasetLevel = {
  level: number;
  detail: string;
};

export type GymDatasetConfig = {
  slug: GymDatasetSlug;
  label: string;
  description: string;
  available: boolean;
  levels: GymDatasetLevel[];
};

export const GYM_DATASETS: GymDatasetConfig[] = [
  {
    slug: 'set_metrics',
    label: 'Set-Level Metrics',
    description: 'Each working set with load, reps, proximity to failure, and volume.',
    available: true,
    levels: [
      { level: 1, detail: 'Per-set rows with load, reps, RIR, tempo, and notes.' },
    ],
  },
  {
    slug: 'workout_sessions',
    label: 'Workout Sessions',
    description: 'Chronological workout logs, session notes, effort ratings, and duration.',
    available: true,
    levels: [
      { level: 2, detail: 'Per-session metadata (date, split, duration, notes).' },
      { level: 3, detail: 'Session + block level annotations (warm-up vs. working sets).' },
    ],
  },
  {
    slug: 'aggregates',
    label: 'Aggregated Summaries',
    description: 'Muscle-group / movement aggregates for faster dashboards and reviews.',
    available: true,
    levels: [
      { level: 3, detail: 'High-level weekly and monthly aggregates per muscle group.' },
    ],
  },
  {
    slug: 'body_metrics',
    label: 'Body Metrics',
    description: 'Body weight, tape measures, health markers, and recovery signals.',
    available: false,
    levels: [
      { level: 2, detail: 'Weekly average weight and HRV snapshots.' },
      { level: 3, detail: 'Daily measurements, Dexa summaries, recovery notes.' },
    ],
  },
];

export const AVAILABLE_GYM_DATASETS = GYM_DATASETS.filter((dataset) => dataset.available);

export const DATASET_DISPLAY_ORDER = GYM_DATASETS.map(
  (dataset) => dataset.slug
) as GymDatasetSlug[];

export const PRIMARY_DATASET_LEVEL = Object.fromEntries(
  GYM_DATASETS.map((dataset) => [dataset.slug, dataset.levels[0]?.level ?? 1])
) as Record<GymDatasetSlug, number>;

export const DATASET_LEVEL_LABELS: Record<GymDatasetSlug, string> = {
  set_metrics: 'Level 1 - Set metrics',
  workout_sessions: 'Level 2 - Session summaries',
  aggregates: 'Level 3 - Aggregated summaries',
  body_metrics: 'Level 2 - Body metrics',
};
