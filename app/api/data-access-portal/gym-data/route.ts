// app/api/data-access-portal/gym-data/route.ts
import { NextResponse } from 'next/server';
import { getRequestFromApiKey } from '@/lib/data-access-portal';
import type { GymDatasetSlug } from '@/types/data-access-portal';

/**
 * This route gates access to your gym dataset by API key and scope.
 * Query params:
 *   dataset: 'workout_sessions' | 'set_metrics' | 'body_metrics' | 'aggregates'
 *   level: 1..4
 *   (optional) startDate, endDate, etc. (you wire into your existing gym APIs)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const apiKey = req.headers.get('x-api-key') ?? url.searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const dataset = url.searchParams.get('dataset') as GymDatasetSlug | null;
    const level = url.searchParams.get('level')
      ? Number(url.searchParams.get('level'))
      : null;

    if (!dataset || !level) {
      return NextResponse.json(
        { error: 'dataset and level query params are required' },
        { status: 400 },
      );
    }

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

    // You can make this stricter by checking requestedDatasets from getDarRequestWithRelations,
    // but for demo, we just gate on "approved" + key validity.
    // If you want strict scopes, swap getRequestFromApiKey for getDarRequestWithRelations.

    // TODO: Wire this into your existing gym data access logic.
    // E.g.:
    // const data = await getGymData({ dataset, level, startDate, endDate })
    // For now, we’ll return a placeholder structure so it’s obvious where to plug in.

    const dummyData = {
      dataset,
      level,
      note: 'Replace this with real gym data wired from your existing demo.',
      exampleShape: {
        rows: [
          { date: '2025-01-01', exercise: 'Bench Press', setVolume: 5000 },
          { date: '2025-01-02', exercise: 'Squat', setVolume: 6000 },
        ],
      },
    };

    return NextResponse.json({ data: dummyData });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}