import { NextRequest, NextResponse } from 'next/server';
import {
  getRequestFromApiKey,
  getDarRequestWithRelations,
  getRequestPalette,
} from '@/lib/data-access-portal';
import { GYM_DATASETS, PRIMARY_DATASET_LEVEL } from '@/lib/gym-datasets';
import { buildVisualizationPackages } from '@/lib/gym-data';
import type { GymDatasetSlug } from '@/types/data-access-portal';

const DATASET_INFO = Object.fromEntries(
  GYM_DATASETS.map((dataset) => [dataset.slug, dataset])
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey =
      (body.apiKey as string | undefined)?.trim() ||
      req.headers.get('x-api-key') ||
      null;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const request = await getRequestFromApiKey(apiKey);
    if (!request || request.status !== 'APPROVED' || request.revokedAt) {
      return NextResponse.json(
        { error: 'API key is not active for any approved request.' },
        { status: 403 }
      );
    }

    const fullRequest = await getDarRequestWithRelations(request.id);
    if (!fullRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const datasets = (fullRequest.requestedDatasets ?? []).map((dataset) => {
      const meta = DATASET_INFO[dataset.datasetSlug];
      const slug = dataset.datasetSlug as GymDatasetSlug;
      return {
        slug: dataset.datasetSlug,
        level: dataset.level ?? PRIMARY_DATASET_LEVEL[slug] ?? null,
        label: meta?.label ?? dataset.datasetSlug,
        description: meta?.description ?? null,
      };
    });

    const visualizationPackages = await buildVisualizationPackages({
      presets: fullRequest.visualizationPresets ?? [],
    });

    const hasVisualizationRequest =
      visualizationPackages.length > 0 || Boolean(fullRequest.visualizationCustomRequest);

    if (datasets.length === 0 && !hasVisualizationRequest) {
      return NextResponse.json(
        { error: 'No datasets or visualization packages are approved for this request yet.' },
        { status: 403 }
      );
    }

    const palette = (await getRequestPalette(fullRequest.id)) ?? null;

    return NextResponse.json({
      request: {
        id: fullRequest.id,
        piName: fullRequest.piName,
        projectTitle: fullRequest.projectTitle,
        datasets,
        visualizationPackages,
        visualizationCustomRequest: fullRequest.visualizationCustomRequest ?? null,
        customDeliveryStatus: fullRequest.customDeliveryStatus ?? null,
        customDeliveryNote: fullRequest.customDeliveryNote ?? null,
        palette,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to unlock datasets for this key.' },
      { status: 500 }
    );
  }
}
