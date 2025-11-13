// app/api/data-access-portal/requests/route.ts
import { NextResponse } from 'next/server';
import {
  createDarRequest,
  listDarRequests,
} from '@/lib/data-access-portal';
import type { GymDatasetSlug } from '@/types/data-access-portal';

export async function GET() {
  try {
    const requests = await listDarRequests();
    return NextResponse.json({ data: requests });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to list requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
      expectedDurationCategory,
      datasets,
      collaborators,
    } = body;

    if (!piName || !piEmail || !institution || !country || !projectTitle || !dataUseProposal) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const created = await createDarRequest({
      piName,
      piEmail,
      piPhone,
      institution,
      country,
      projectTitle,
      dataUseProposal,
      plannedStart: plannedStart || null,
      plannedEnd: plannedEnd || null,
      expectedDurationCategory: expectedDurationCategory || null,
      datasets: (datasets ?? []) as { datasetSlug: GymDatasetSlug; level: number }[],
      collaborators: collaborators ?? [],
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}