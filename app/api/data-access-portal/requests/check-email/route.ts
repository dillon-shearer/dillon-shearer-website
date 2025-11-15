import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 },
      );
    }

    const existsResult = await sql`
      SELECT 1
      FROM dar_requests
      WHERE LOWER(pi_email) = LOWER(${email})
      LIMIT 1
    `;

    return NextResponse.json({ exists: (existsResult?.rowCount ?? 0) > 0 });
  } catch (err) {
    console.error('Failed to check request email availability', err);
    return NextResponse.json(
      { error: 'Unable to verify email availability.' },
      { status: 500 },
    );
  }
}
