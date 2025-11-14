'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DarRequest, DarRequestStatus } from '@/types/data-access-portal';

const STATUS_COLORS: Record<DarRequestStatus, string> = {
  SUBMITTED: 'bg-zinc-800 text-zinc-100 border-zinc-700',
  IN_REVIEW: 'bg-sky-500/10 text-sky-300 border-sky-500/60',
  APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/60',
  DENIED: 'bg-red-500/10 text-red-300 border-red-500/60',
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
    const haystack = `${r.piName} ${r.piEmail} ${r.institution} ${r.country}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    return true;
  });

  const statusSummary = useMemo(() => {
    return requests.reduce(
      (acc, req) => {
        acc[req.status] = (acc[req.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<DarRequestStatus, number>
    );
  }, [requests]);

  const completedRequests = useMemo(
    () => requests.filter((r) => r.status === 'APPROVED' || r.status === 'DENIED'),
    [requests]
  );

  const completedSummary = useMemo(() => {
    return completedRequests.reduce(
      (acc, req) => {
        acc[req.status] = (acc[req.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<DarRequestStatus, number>
    );
  }, [completedRequests]);

  const monthlySummary = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach((req) => {
      const d = new Date(req.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const now = new Date();
    const buckets: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const label = dt.toLocaleDateString('en-US', { month: 'short' });
      buckets.push({ label, count: map.get(key) ?? 0 });
    }
    return buckets;
  }, [requests]);

  const monthlyMax = Math.max(1, ...monthlySummary.map((b) => b.count));

  const totalRequests = requests.length;
  const completedTotal = completedRequests.length;
  const completedApproved = completedSummary.APPROVED ?? 0;
  const completedDenied = completedSummary.DENIED ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Demo - Admin
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
                Data Access Requests - Admin View
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-400">
                This table mirrors an internal tracker for data access workflows: see all
                requests at a glance, filter by status, and drill into individual requests to
                approve or deny.
              </p>
            </div>
            <Link
              href="/demos/data-access-portal"
              className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
            >
              Back to portal
            </Link>
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
            </select>
          </div>
        </div>

        <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
          <div className="w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40 shadow-sm shadow-black/40">
            <div className="border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Requests ({filtered.length})
            </div>
            <div className="max-h-[480px] overflow-y-auto overflow-x-hidden">
              <table className="min-w-full table-fixed text-xs">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[34%]" />
                  <col className="w-[22%]" />
                  <col className="w-[16%]" />
                  <col className="w-[6%]" />
                  <col className="w-[4%]" />
                </colgroup>
                <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur">
                  <tr className="border-b border-zinc-800/80 text-[11px] text-zinc-500">
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Requester</th>
                    <th className="px-4 py-2 text-left font-medium">Institution</th>
                    <th className="px-4 py-2 text-left font-medium">Country</th>
                    <th className="px-4 py-2 text-left font-medium">Created</th>
                    <th className="px-4 py-2 text-right font-medium">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-[11px] text-zinc-500"
                      >
                        Loading requests...
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
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
                      <td className="px-4 py-2 align-top">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] font-medium ${STATUS_COLORS[r.status]}`}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-top">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium text-zinc-100">
                            {r.piName}
                          </span>
                          <span className="truncate font-mono text-[10px] text-zinc-500">
                            {r.piEmail}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-top">
                        <span className="block truncate text-[11px] text-zinc-200">
                          {r.institution}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-top">
                        <span className="block truncate text-[11px] text-zinc-300">
                          {r.country}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 align-top">
                        <span className="text-[11px] text-zinc-400">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right align-top">
                        <Link
                          href={`/demos/data-access-portal/admin/${r.id}`}
                          className="text-[11px] text-sky-400 hover:text-sky-300"
                        >
                          View &gt;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 xl:min-h-[480px]">
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="Total requests" value={totalRequests} />
              <SummaryCard
                label="Approved"
                value={statusSummary.APPROVED ?? 0}
                accent="text-emerald-300"
              />
              <SummaryCard
                label="In review"
                value={statusSummary.IN_REVIEW ?? 0}
                accent="text-sky-300"
              />
              <SummaryCard
                label="Denied"
                value={statusSummary.DENIED ?? 0}
                accent="text-red-300"
              />
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                Requests per month
              </p>
              <div className="mt-4 flex flex-1 items-end justify-between gap-3">
                {monthlySummary.map((bucket) => {
                  const height = Math.max(6, (bucket.count / monthlyMax) * 60);
                  return (
                    <div
                      key={bucket.label}
                      className="flex flex-col items-center gap-1 text-[10px] text-zinc-500"
                    >
                      <div
                        className="w-6 rounded-full bg-gradient-to-t from-zinc-800 to-emerald-500/60"
                        style={{ height: `${height}px` }}
                        title={`${bucket.count} requests`}
                      />
                      <span>{bucket.label}</span>
                      <span className="text-zinc-300">{bucket.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                Request funnel
              </p>
              <div className="mt-4 space-y-4 text-[11px] text-zinc-400">
                <div>
                  <p className="mb-1 text-zinc-500">Completed decisions</p>
                  <div className="h-3 w-full rounded-full bg-zinc-900">
                    <div
                      className="h-full rounded-full bg-emerald-500/80"
                      style={{ width: `${completedTotal > 0 ? 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-center text-zinc-200">
                    {completedTotal.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-zinc-500">Approvals vs denials</p>
                  {completedTotal === 0 ? (
                    <p className="text-center text-zinc-500">
                      No completed decisions yet.
                    </p>
                  ) : (
                    <>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-900">
                        <div
                          className="h-full bg-emerald-500/80"
                          style={{
                            width: `${(completedApproved / completedTotal) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-red-500/80"
                          style={{
                            width: `${(completedDenied / completedTotal) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-center text-zinc-200">
                        {completedApproved} approved vs {completedDenied} denied
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-4 text-center">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold text-zinc-50 ${accent ?? ''}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
