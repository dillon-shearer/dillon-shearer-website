// app/api/data-access-portal/requests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getDarRequestWithRelations,
  updateDarRequest,
  approveDarRequest,
  denyDarRequest,
  revokeDarRequest,
  markDarRequestInReview,
  replaceRequestedDatasets,
  replaceDarCollaborators,
} from '@/lib/data-access-portal';
import { PRIMARY_DATASET_LEVEL } from '@/lib/gym-datasets';
import { COUNTRY_OPTIONS } from '@/lib/constants/countries';
import type { GymDatasetSlug } from '@/types/data-access-portal';

type PathParams = { params: Promise<{ id: string }> };

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

export async function GET(_req: NextRequest, { params }: PathParams) {
  try {
    const { id } = await params;
    let request = await getDarRequestWithRelations(id);
    if (request?.status === 'SUBMITTED') {
      const inReview = await markDarRequestInReview(id);
      if (inReview) {
        request = inReview;
      }
    }
    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ data: request });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: PathParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body as { action?: string };

    // "updatedBy" is just a string label for demo purposes
    const updatedBy = 'demo-admin';

    if (action === 'update') {
      const patch = (body.patch ?? {}) as {
        piName?: string;
        piEmail?: string;
        piPhone?: string | null;
        institution?: string;
        country?: string;
        projectTitle?: string | null;
        dataUseProposal?: string;
        plannedStart?: string | null;
        plannedEnd?: string | null;
      };

      const datasetEntries = Array.isArray(body.datasets) ? body.datasets : null;
      if (!datasetEntries) {
        return NextResponse.json(
          { error: 'Dataset selections are required.' },
          { status: 400 }
        );
      }

      if (patch.country && !COUNTRY_OPTIONS.includes(patch.country)) {
        return NextResponse.json(
          { error: 'Country must be selected from the provided list.' },
          { status: 400 }
        );
      }

      const normalizedDatasets = datasetEntries
        .filter((entry: any) => typeof entry?.datasetSlug === 'string')
        .map((entry: any) => {
          const datasetSlug = entry.datasetSlug as GymDatasetSlug;
          return {
            datasetSlug,
            level: resolveDatasetLevel(datasetSlug, entry.level),
          };
        });

      if (normalizedDatasets.length === 0) {
        return NextResponse.json(
          { error: 'Select at least one dataset scope.' },
          { status: 400 }
        );
      }

      const collaboratorEntries = Array.isArray(body.collaborators) ? body.collaborators : [];
      const normalizedCollaborators: Array<{ name: string; email: string; phone?: string | null }> = [];
      for (let i = 0; i < collaboratorEntries.length; i += 1) {
        const collab = collaboratorEntries[i] ?? {};
        const firstName = (collab.firstName ?? '').trim();
        const lastName = (collab.lastName ?? '').trim();
        const email = (collab.email ?? '').trim();
        if (!firstName || !lastName || !email) {
          return NextResponse.json(
            { error: `Collaborator ${i + 1} is missing required fields.` },
            { status: 400 },
          );
        }
        normalizedCollaborators.push({
          name: `${firstName} ${lastName}`.trim(),
          email,
          phone: (collab.phone ?? '').trim() || null,
        });
      }

      if (!patch.plannedStart || !patch.plannedEnd) {
        return NextResponse.json(
          { error: 'Planned start and end dates are required.' },
          { status: 400 }
        );
      }

      const startDate = new Date(patch.plannedStart);
      const endDate = new Date(patch.plannedEnd);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date('2999-12-31');

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Provide valid planned project dates.' },
          { status: 400 },
        );
      }

      if (endDate < today) {
        return NextResponse.json(
          { error: 'Planned end date cannot be in the past.' },
          { status: 400 },
        );
      }

      if (endDate > maxDate) {
        return NextResponse.json(
          { error: 'Planned end date is too far in the future.' },
          { status: 400 },
        );
      }

      if (startDate > endDate) {
        return NextResponse.json(
          { error: 'Planned end date must be after the start date.' },
          { status: 400 },
        );
      }

      const patched = await updateDarRequest(id, patch, updatedBy);
      if (!patched) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      await replaceRequestedDatasets(id, normalizedDatasets);
      await replaceDarCollaborators(id, normalizedCollaborators);
      const refreshed = await getDarRequestWithRelations(id);

      return NextResponse.json({ data: refreshed ?? patched });
    }

    if (action === 'approve') {
      const { request, apiKey } = await approveDarRequest(id, updatedBy);
      if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      // Return the raw key ONCE for the UI to show
      return NextResponse.json({ data: request, apiKey });
    }

    if (action === 'deny') {
      const { reason } = body as { reason?: string };
      const patched = await denyDarRequest(id, reason ?? 'No reason provided', updatedBy);
      if (!patched) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: patched });
    }

    if (action === 'revoke') {
      const patched = await revokeDarRequest(id, updatedBy);
      if (!patched) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: patched });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
