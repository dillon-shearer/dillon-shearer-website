// app/api/data-access-portal/requests/[id]/route.ts
import { NextResponse } from 'next/server';
import {
  getDarRequestWithRelations,
  updateDarRequest,
  approveDarRequest,
  denyDarRequest,
  revokeDarRequest,
} from '@/lib/data-access-portal';

type PathParams = { params: { id: string } };

export async function GET(_req: Request, { params }: PathParams) {
  try {
    const request = await getDarRequestWithRelations(params.id);
    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ data: request });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: PathParams) {
  try {
    const body = await req.json();
    const { action } = body as { action?: string };

    // "updatedBy" is just a string label for demo purposes
    const updatedBy = 'demo-admin';

    if (action === 'update') {
      const patched = await updateDarRequest(params.id, body.patch ?? {}, updatedBy);
      if (!patched) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: patched });
    }

    if (action === 'approve') {
      const { request, apiKey } = await approveDarRequest(params.id, updatedBy);
      if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      // Return the raw key ONCE for the UI to show
      return NextResponse.json({ data: request, apiKey });
    }

    if (action === 'deny') {
      const { reason } = body as { reason?: string };
      const patched = await denyDarRequest(params.id, updatedBy, reason ?? 'No reason provided');
      if (!patched) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: patched });
    }

    if (action === 'revoke') {
      const patched = await revokeDarRequest(params.id, updatedBy);
      if (!patched) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ data: patched });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
