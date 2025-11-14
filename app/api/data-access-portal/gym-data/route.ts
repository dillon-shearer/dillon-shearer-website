// app/api/data-access-portal/gym-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getRequestFromApiKey,
  getDarRequestWithRelations,
} from '@/lib/data-access-portal';
import type { GymDatasetSlug } from '@/types/data-access-portal';
import { fetchDatasetData, rowsToCsv } from '@/lib/gym-data';

/**
 * This route gates access to your gym dataset by API key and scope.
 * Query params:
 *   dataset: 'workout_sessions' | 'set_metrics' | 'aggregates'
 *   format: 'json' (default) | 'csv'
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const apiKey = req.headers.get('x-api-key') ?? url.searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const dataset = url.searchParams.get('dataset') as GymDatasetSlug | null;
    if (!dataset) {
      return NextResponse.json(
        { error: 'dataset query param is required' },
        { status: 400 },
      );
    }

    const format = (url.searchParams.get('format') ?? 'json').toLowerCase();

    const request = await getRequestFromApiKey(apiKey);
    if (!request) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    if (request.status !== 'APPROVED' || request.revokedAt) {
      return NextResponse.json(
        { error: 'Access not approved or has been revoked' },
        { status: 403 },
      );
    }

    const fullRequest = await getDarRequestWithRelations(request.id);
    if (!fullRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const allowedDatasets = new Set(
      (fullRequest.requestedDatasets ?? []).map((entry) => entry.datasetSlug)
    );

    if (!allowedDatasets.has(dataset)) {
      return NextResponse.json(
        { error: 'This dataset was not approved for the provided key.' },
        { status: 403 },
      );
    }

    const payload = await fetchDatasetData(dataset);

    if (format === 'csv') {
      const csv = rowsToCsv(payload.rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${dataset}.csv"`,
        },
      });
    }

    return NextResponse.json({ data: payload });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
