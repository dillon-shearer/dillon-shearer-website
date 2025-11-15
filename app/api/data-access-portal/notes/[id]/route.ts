// app/api/data-access-portal/notes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getDarRequestNotes,
  saveDarRequestNotes,
} from '@/lib/data-access-portal';

type PathParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: PathParams) {
  try {
    const { id } = await params;
    const notes = await getDarRequestNotes(id);
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Failed to fetch DAR notes', error);
    return NextResponse.json({ error: 'Unable to load notes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: PathParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const payload = {
      notes: typeof body?.notes === 'string' ? body.notes : null,
      followUp: typeof body?.followUp === 'string' ? body.followUp : null,
    };
    const saved = await saveDarRequestNotes(id, payload);
    return NextResponse.json({ notes: saved });
  } catch (error) {
    console.error('Failed to save DAR notes', error);
    return NextResponse.json({ error: 'Unable to save notes' }, { status: 500 });
  }
}
