import { sql } from '@vercel/postgres';
import { AVAILABLE_GYM_DATASETS } from './gym-datasets';
import type { DarVisualizationPreset, GymDatasetSlug } from '@/types/data-access-portal';

type DatasetRow = Record<string, any>;

export type DatasetPayload = {
  slug: GymDatasetSlug;
  label: string;
  rows: DatasetRow[];
  meta?: Record<string, any>;
  description?: string;
};

export type VisualizationPackage = {
  id: string;
  presetId: DarVisualizationPreset;
  title: string;
  description: string;
  chart: {
    type: 'bar' | 'line' | 'doughnut';
    xLabel: string;
    yLabel: string;
    series: Array<{ label: string; value: number; color: string; extra?: Record<string, any> }>;
  };
  data: Record<string, any>;
  status: 'ready';
};

const DATASET_LABELS = Object.fromEntries(
  AVAILABLE_GYM_DATASETS.map((ds) => [ds.slug, ds.label])
);
const DATASET_DESCRIPTIONS = Object.fromEntries(
  AVAILABLE_GYM_DATASETS.map((ds) => [ds.slug, ds.description])
);

const toNumber = (value: any) => (typeof value === 'number' ? value : Number(value ?? 0));
const DEFAULT_VISUAL_PALETTE = ['#34d399', '#22d3ee', '#a855f7', '#f97316', '#facc15'];

const resolvePaletteColor = (palette: string[], index: number) => {
  const source = palette.length > 0 ? palette : DEFAULT_VISUAL_PALETTE;
  return source[index % source.length];
};

export function rowsToCsv(rows: DatasetRow[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = row[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') {
            const escaped = value.replace(/"/g, '""');
            return `"${escaped}"`;
          }
          return `${value}`;
        })
        .join(',')
    ),
  ];
  return csvRows.join('\n');
}

async function fetchWorkoutSessions(): Promise<DatasetPayload> {
  const { rows } = await sql/* sql */`
    SELECT
      date::date                               AS date,
      COALESCE(day_tag, 'unspecified')         AS "dayTag",
      COUNT(*)                                 AS "totalSets",
      COUNT(DISTINCT exercise)                 AS "uniqueExercises",
      SUM(COALESCE(weight, 0) * COALESCE(reps, 0)) AS volume,
      MIN(timestamp)::text                     AS "sessionStart",
      MAX(timestamp)::text                     AS "sessionEnd"
    FROM gym_lifts
    GROUP BY date::date, day_tag
    ORDER BY date::date DESC
    LIMIT 90
  `;

  const sessionRows = rows.map((row) => ({
    date: row.date,
    dayTag: row.dayTag,
    totalSets: Number(row.totalSets),
    uniqueExercises: Number(row.uniqueExercises),
    volume: Number(row.volume || 0),
    sessionStart: row.sessionStart,
    sessionEnd: row.sessionEnd,
  }));

  return {
    slug: 'workout_sessions',
    label: DATASET_LABELS['workout_sessions'],
    description: DATASET_DESCRIPTIONS['workout_sessions'],
    rows: sessionRows,
  };
}

async function fetchSetMetrics(): Promise<DatasetPayload> {
  const { rows } = await sql/* sql */`
    SELECT
      id,
      date::date                               AS date,
      exercise,
      set_number                               AS "setNumber",
      weight,
      reps,
      (COALESCE(weight, 0) * COALESCE(reps, 0)) AS volume,
      day_tag                                  AS "dayTag",
      is_unilateral                            AS "isUnilateral",
      equipment
    FROM gym_lifts
    ORDER BY date::date DESC, (timestamp::timestamptz) DESC
    LIMIT 500
  `;

  const rowsFormatted = rows.map((row) => ({
    id: row.id,
    date: row.date,
    exercise: row.exercise,
    setNumber: Number(row.setNumber),
    weight: toNumber(row.weight),
    reps: Number(row.reps),
    volume: Number(row.volume || 0),
    dayTag: row.dayTag,
    isUnilateral: row.isUnilateral,
    equipment: row.equipment,
  }));

  return {
    slug: 'set_metrics',
    label: DATASET_LABELS['set_metrics'],
    description: DATASET_DESCRIPTIONS['set_metrics'],
    rows: rowsFormatted,
  };
}

async function fetchAggregates(): Promise<DatasetPayload> {
  const weekly = await sql/* sql */`
    SELECT
      DATE_TRUNC('week', date::date)::date            AS week,
      COUNT(DISTINCT date::date)                      AS sessions,
      SUM(COALESCE(weight, 0) * COALESCE(reps, 0))    AS volume,
      AVG(COALESCE(weight, 0))                        AS "avgWeight"
    FROM gym_lifts
    GROUP BY week
    ORDER BY week DESC
    LIMIT 26
  `;

  const monthly = await sql/* sql */`
    SELECT
      DATE_TRUNC('month', date::date)::date           AS month,
      COUNT(DISTINCT date::date)                      AS sessions,
      SUM(COALESCE(weight, 0) * COALESCE(reps, 0))    AS volume
    FROM gym_lifts
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `;

  const weeklyRows = weekly.rows.map((row) => ({
    week: row.week,
    sessions: Number(row.sessions),
    volume: Number(row.volume || 0),
    avgWeight: Number(row.avgWeight || 0),
  }));

  const monthlyRows = monthly.rows.map((row) => ({
    month: row.month,
    sessions: Number(row.sessions),
    volume: Number(row.volume || 0),
  }));

  return {
    slug: 'aggregates',
    label: DATASET_LABELS['aggregates'],
    description: DATASET_DESCRIPTIONS['aggregates'],
    rows: weeklyRows,
    meta: {
      monthly: monthlyRows,
    },
  };
}

export async function fetchDatasetData(slug: GymDatasetSlug): Promise<DatasetPayload> {
  switch (slug) {
    case 'workout_sessions':
      return fetchWorkoutSessions();
    case 'set_metrics':
      return fetchSetMetrics();
    case 'aggregates':
      return fetchAggregates();
    default:
      throw new Error('Dataset not supported yet.');
  }
}

async function buildSplitAllTime(palette: string[]): Promise<VisualizationPackage | null> {
  const result = await sql/* sql */`
    SELECT
      CASE
        WHEN LOWER(COALESCE(day_tag, '')) LIKE 'push%' THEN 'Push'
        WHEN LOWER(COALESCE(day_tag, '')) LIKE 'pull%' THEN 'Pull'
        WHEN LOWER(COALESCE(day_tag, '')) ~ 'leg|lower' THEN 'Legs'
        ELSE 'Accessory / Other'
      END AS split_label,
      COUNT(DISTINCT date::date) AS sessions,
      SUM(COALESCE(weight, 0) * COALESCE(reps, 0)) AS volume
    FROM gym_lifts
    GROUP BY split_label
    ORDER BY volume DESC
  `;

  if ((result.rowCount ?? 0) === 0) return null;

  const series = result.rows.map((row, index) => ({
    label: row.split_label,
    value: Number(row.volume || 0),
    color: resolvePaletteColor(palette, index),
    extra: { sessions: Number(row.sessions) },
  }));

  return {
    id: 'viz-split-all-time',
    presetId: 'split-all-time',
    title: 'All-time split distribution',
    description: 'Lifetime tonnage + sessions broken out by push/pull/legs.',
    chart: {
      type: 'doughnut',
      xLabel: 'Split',
      yLabel: 'Volume (lb-reps)',
      series,
    },
    data: {
      totals: series,
    },
    status: 'ready',
  };
}

async function buildVolumeAllTime(palette: string[]): Promise<VisualizationPackage | null> {
  const result = await sql/* sql */`
    SELECT
      DATE_TRUNC('week', date::date)::date AS week,
      SUM(COALESCE(weight, 0) * COALESCE(reps, 0)) AS volume
    FROM gym_lifts
    GROUP BY week
    ORDER BY week ASC
  `;
  if ((result.rowCount ?? 0) === 0) return null;
  const color = resolvePaletteColor(palette, 0);
  const series = result.rows.map((row) => ({
    label: row.week,
    value: Number(row.volume || 0),
    color,
  }));
  return {
    id: 'viz-volume-all-time',
    presetId: 'volume-all-time',
    title: 'All-time weekly volume',
    description: 'Each dot is a week in the database with total lb-reps.',
    chart: {
      type: 'line',
      xLabel: 'Week',
      yLabel: 'Total volume (lb-reps)',
      series,
    },
    data: { points: series },
    status: 'ready',
  };
}

async function buildRepBandsAllTime(palette: string[]): Promise<VisualizationPackage | null> {
  const result = await sql/* sql */`
    WITH bands AS (
      SELECT
        CASE
          WHEN reps <= 5 THEN '<=5 (strength)'
          WHEN reps BETWEEN 6 AND 8 THEN '6-8'
          WHEN reps BETWEEN 9 AND 12 THEN '9-12'
          WHEN reps BETWEEN 13 AND 15 THEN '13-15'
          ELSE '16+'
        END AS band,
        COUNT(*) AS sets,
        SUM(COALESCE(weight, 0) * COALESCE(reps, 0)) AS volume
      FROM gym_lifts
      GROUP BY band
    )
    SELECT band, sets, volume
    FROM bands
    ORDER BY
      CASE band
        WHEN '<=5 (strength)' THEN 1
        WHEN '6-8' THEN 2
        WHEN '9-12' THEN 3
        WHEN '13-15' THEN 4
        ELSE 5
      END
  `;
  if ((result.rowCount ?? 0) === 0) return null;
  const series = result.rows.map((row, index) => ({
    label: row.band,
    value: Number(row.sets || 0),
    color: resolvePaletteColor(palette, index),
    extra: { volume: Number(row.volume || 0) },
  }));
  return {
    id: 'viz-rep-all-time',
    presetId: 'rep-all-time',
    title: 'Rep zones across all time',
    description: 'Shows how often you live in each rep band.',
    chart: {
      type: 'bar',
      xLabel: 'Rep band',
      yLabel: 'Sets logged',
      series,
    },
    data: { bands: series },
    status: 'ready',
  };
}

async function buildTrainingDaysAllTime(palette: string[]): Promise<VisualizationPackage | null> {
  const result = await sql/* sql */`
    SELECT
      EXTRACT(DOW FROM date::date)::int AS dow,
      TRIM(TO_CHAR(date::date, 'Day')) AS day_label,
      COUNT(DISTINCT date::date) AS sessions
    FROM gym_lifts
    GROUP BY dow, day_label
    ORDER BY dow
  `;
  if ((result.rowCount ?? 0) === 0) return null;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ordered = dayNames.map((name, index) => {
    const row = result.rows.find((r) => Number(r.dow) === index);
    return {
      label: name,
      value: row ? Number(row.sessions || 0) : 0,
    };
  });
  const series = ordered.map((row, index) => ({
    label: row.label,
    value: row.value,
    color: resolvePaletteColor(palette, index),
  }));
  return {
    id: 'viz-training-days-all-time',
    presetId: 'training-days-all-time',
    title: 'Training days per weekday (all time)',
    description: 'Counts how many sessions you logged on each weekday since tracking began.',
    chart: {
      type: 'bar',
      xLabel: 'Weekday',
      yLabel: 'Sessions logged',
      series,
    },
    data: { weekdays: series },
    status: 'ready',
  };
}

const VIS_PACKAGE_BUILDERS: Record<
  DarVisualizationPreset,
  (palette: string[]) => Promise<VisualizationPackage | null>
> = {
  'split-all-time': buildSplitAllTime,
  'volume-all-time': buildVolumeAllTime,
  'rep-all-time': buildRepBandsAllTime,
  'training-days-all-time': buildTrainingDaysAllTime,
};

export async function buildVisualizationPackages(options: {
  presets: DarVisualizationPreset[];
  palette?: string[];
}): Promise<VisualizationPackage[]> {
  const uniquePresets = Array.from(new Set(options.presets));
  const results: VisualizationPackage[] = [];
  const palette = options.palette ?? [];
  for (const preset of uniquePresets) {
    const builder = VIS_PACKAGE_BUILDERS[preset];
    if (!builder) continue;
    const pkg = await builder(palette);
    if (pkg) {
      results.push(pkg);
    }
  }
  return results;
}
