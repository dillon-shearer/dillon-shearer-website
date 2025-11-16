import { NextResponse } from 'next/server';
import { listDarRequests } from '@/lib/data-access-portal';

const csvEscape = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export async function GET() {
  try {
    const requests = await listDarRequests();
    const headers = [
      'id',
      'piName',
      'piEmail',
      'institution',
      'country',
      'projectTitle',
      'status',
      'createdAt',
      'updatedAt',
      'collaboratorCount',
    ];
    const rows = requests.map((req) => [
      csvEscape(req.id),
      csvEscape(req.piName),
      csvEscape(req.piEmail),
      csvEscape(req.institution),
      csvEscape(req.country),
      csvEscape(req.projectTitle ?? ''),
      csvEscape(req.status),
      csvEscape(req.createdAt),
      csvEscape(req.updatedAt),
      csvEscape(req.collaboratorCount ?? req.collaborators?.length ?? 0),
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="dar-admin-export.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Failed to export DAR admin data', err);
    return NextResponse.json({ error: 'Failed to export admin data' }, { status: 500 });
  }
}
