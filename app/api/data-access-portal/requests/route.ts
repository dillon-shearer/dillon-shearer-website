// app/api/data-access-portal/requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { createDarRequest, listDarRequests } from '@/lib/data-access-portal';
import { PRIMARY_DATASET_LEVEL } from '@/lib/gym-datasets';
import { COUNTRY_OPTIONS } from '@/lib/constants/countries';
import type { DarVisualizationPreset, GymDatasetSlug } from '@/types/data-access-portal';

const resolveDatasetLevel = (
  slug: string | null | undefined,
  fallback?: number | null
) => {
  if (!slug) return fallback ?? 1;
  return (
    PRIMARY_DATASET_LEVEL[slug as GymDatasetSlug] ??
    (typeof fallback === 'number' ? fallback : 1)
  );
};

export async function GET(_req: NextRequest) {
  try {
    const requests = await listDarRequests();
    return NextResponse.json({ data: requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to list requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      piName,
      piEmail,
      piPhone,
      institution,
      country,
      projectTitle,
      dataUseProposal,
      plannedStart,
      plannedEnd,
      datasets,
      collaborators,
      visualizationPresets,
      visualizationCustomRequest,
    } = body;

    if (!piName || !piEmail || !institution || !country || !dataUseProposal) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    if (!COUNTRY_OPTIONS.includes(country)) {
      return NextResponse.json(
        { error: 'Country must be selected from the provided list.' },
        { status: 400 }
      );
    }

    const normalizedProjectTitle =
      typeof projectTitle === 'string' && projectTitle.trim().length > 0
        ? projectTitle.trim()
        : null;

    if (!plannedStart || !plannedEnd) {
      return NextResponse.json(
        { error: 'Planned start and end dates are required.' },
        { status: 400 },
      );
    }

    const startDate = new Date(plannedStart);
    const endDate = new Date(plannedEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date('2999-12-31');

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid planned project dates.' },
        { status: 400 },
      );
    }

    if (endDate < today) {
      return NextResponse.json(
        { error: 'Planned project end date cannot be in the past.' },
        { status: 400 },
      );
    }

    if (endDate > maxDate) {
      return NextResponse.json(
        { error: 'Planned project end date is too far in the future.' },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Planned end date must be after the start date.' },
        { status: 400 },
      );
    }

    const normalizedDatasets = Array.isArray(datasets)
      ? (datasets as Array<{ datasetSlug?: string; level?: number }>)
          .filter((entry) => typeof entry?.datasetSlug === 'string')
          .map((entry) => {
            const datasetSlug = entry.datasetSlug as GymDatasetSlug;
            return {
              datasetSlug,
              level: resolveDatasetLevel(datasetSlug, entry.level),
            };
          })
      : [];

    const dupeCheck = await sql`
      SELECT 1
      FROM dar_requests
      WHERE LOWER(pi_email) = LOWER(${piEmail})
      LIMIT 1
    `;

    if ((dupeCheck?.rowCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            'This email address has already requested data access. Please reach out to an admin for more information.',
        },
        { status: 409 },
      );
    }

    const normalizedCollaborators = Array.isArray(collaborators)
      ? collaborators
      : [];

    const allowedVizPresets: DarVisualizationPreset[] = [
      'split-all-time',
      'volume-all-time',
      'rep-all-time',
      'training-days-all-time',
    ];
    const normalizedVizPresets = Array.isArray(visualizationPresets)
      ? (visualizationPresets as string[]).filter((preset) =>
          allowedVizPresets.includes(preset as DarVisualizationPreset)
        )
      : [];
    const normalizedVizCustom =
      typeof visualizationCustomRequest === 'string' &&
      visualizationCustomRequest.trim().length > 0
        ? visualizationCustomRequest.trim()
        : null;
    const hasVisualizationRequest =
      normalizedVizPresets.length > 0 || Boolean(normalizedVizCustom);

    if (normalizedDatasets.length === 0 && !hasVisualizationRequest) {
      return NextResponse.json(
        { error: 'Select at least one dataset or visualization package.' },
        { status: 400 }
      );
    }

    const created = await createDarRequest({
      piName,
      piEmail,
      piPhone,
      institution,
      country,
      projectTitle: normalizedProjectTitle,
      dataUseProposal,
      plannedStart: plannedStart || null,
      plannedEnd: plannedEnd || null,
      datasets: normalizedDatasets,
      collaborators: normalizedCollaborators,
      visualizationPresets: normalizedVizPresets,
      visualizationCustomRequest: normalizedVizCustom,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
