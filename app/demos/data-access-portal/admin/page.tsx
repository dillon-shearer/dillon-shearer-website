'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { DarRequest, DarRequestStatus } from '@/types/data-access-portal';

const STATUS_COLORS: Record<DarRequestStatus, string> = {
  SUBMITTED: 'bg-zinc-800 text-zinc-100 border-zinc-700',
  IN_REVIEW: 'bg-sky-500/10 text-sky-300 border-sky-500/60',
  APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/60',
  DENIED: 'bg-red-500/10 text-red-300 border-red-500/60',
  REVOKED: 'bg-amber-500/10 text-amber-300 border-amber-500/60',
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<DarRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | DarRequestStatus>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/data-access-portal/requests', {
          cache: 'no-store',
        });
        const json = await res.json();
        setRequests(json.data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    const haystack = `${r.piName} ${r.piEmail} ${r.institution} ${r.country} ${r.projectTitle}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Demo • Admin
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
              Data Access Requests – Admin View
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              This table mirrors an internal tracker for data access workflows: see all
              requests at a glance, filter by status, and drill into individual requests to
              approve or deny.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              placeholder="Search name, email, institution..."
              className="w-full rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70 md:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="w-full rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70 md:w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="IN_REVIEW">In review</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40 shadow-sm shadow-black/40">
          <div className="border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Requests ({filtered.length})
          </div>
          <div className="max-h-[540px] overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur">
                <tr className="border-b border-zinc-800/80 text-[11px] text-zinc-500">
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Requester</th>
                  <th className="px-4 py-2 text-left font-medium">Institution</th>
                  <th className="px-4 py-2 text-left font-medium">Country</th>
                  <th className="px-4 py-2 text-left font-medium">Project</th>
                  <th className="px-4 py-2 text-left font-medium">Created</th>
                  <th className="px-4 py-2 text-right font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-[11px] text-zinc-500"
                    >
                      Loading requests...
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-[11px] text-zinc-500"
                    >
                      No requests match the current filters.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-zinc-900/80 hover:bg-zinc-900/60"
                  >
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] font-medium ${STATUS_COLORS[r.status]}`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-100">
                          {r.piName}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {r.piEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] text-zinc-200">
                        {r.institution}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] text-zinc-300">
                        {r.country}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="line-clamp-2 text-[11px] text-zinc-300">
                        {r.projectTitle}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[11px] text-zinc-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/demos/data-access-portal/admin/${r.id}`}
                        className="text-[11px] text-sky-400 hover:text-sky-300"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
