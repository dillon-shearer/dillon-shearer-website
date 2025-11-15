import { NextRequest, NextResponse } from 'next/server';
import { getRequestFromApiKey, saveRequestPalette } from '@/lib/data-access-portal';

const MIN_PALETTE_COLORS = 2;
const MAX_PALETTE_COLORS = 5;
const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = (body.apiKey as string | undefined)?.trim();
    const paletteInput = Array.isArray(body.palette) ? body.palette : [];

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
    }

    const request = await getRequestFromApiKey(apiKey);
    if (!request || request.status !== 'APPROVED' || request.revokedAt) {
      return NextResponse.json(
        { error: 'API key is not active for any approved request.' },
        { status: 403 }
      );
    }

    const sanitized = paletteInput
      .map((color: unknown) => (typeof color === 'string' ? color.trim() : ''))
      .filter((color: string) => HEX_REGEX.test(color))
      .slice(0, MAX_PALETTE_COLORS);

    if (sanitized.length < MIN_PALETTE_COLORS) {
      return NextResponse.json(
        {
          error: `Palette must contain between ${MIN_PALETTE_COLORS} and ${MAX_PALETTE_COLORS} valid colors.`,
        },
        { status: 400 }
      );
    }

    await saveRequestPalette(request.id, sanitized);

    return NextResponse.json({ palette: sanitized });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save palette.' }, { status: 500 });
  }
}
