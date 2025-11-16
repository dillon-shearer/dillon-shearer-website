'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalPageShell } from '../_components/page-shell';
import type { DarRequest, DarRequestStatus } from '@/types/data-access-portal';

const STATUS_COLORS: Record<DarRequestStatus, string> = {
  SUBMITTED: 'bg-zinc-800 text-zinc-100 border-zinc-700',
  IN_REVIEW: 'bg-sky-500/10 text-sky-300 border-sky-500/60',
  APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/60',
  DENIED: 'bg-red-500/10 text-red-300 border-red-500/60',
};

export default function AdminRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<DarRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | DarRequestStatus>('ALL');
  const [search, setSearch] = useState('');
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [downloading, setDownloading] = useState(false);

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
  const submittedCount = statusSummary.SUBMITTED ?? 0;
  const inReviewCount = statusSummary.IN_REVIEW ?? 0;
  const approvedCount = completedApproved;
  const deniedCount = completedDenied;
  const pendingDecisions = Math.max(totalRequests - completedTotal, 0);
  const activeQueue = submittedCount + inReviewCount;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentSlice = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search, requests.length]);

  const handlePageChange = (direction: 'prev' | 'next') => {
    setCurrentPage((prev) => {
      if (direction === 'prev') return Math.max(1, prev - 1);
      return Math.min(totalPages, prev + 1);
    });
  };

  const handleAdminExport = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/data-access-portal/requests/export', {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch export');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dar-admin-export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download admin data', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PortalPageShell
      eyebrow="Demo - Admin"
      title="Data Access Requests - Admin View"
      description="This table mirrors an internal tracker for data access workflows: see all requests at a glance, filter by status, and drill into individual requests to approve or deny."
      actions={
        <Link
          href="/demos/data-access-portal"
          className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
        >
          Back to portal
        </Link>
      }
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <input
              placeholder="Search name, email, institution..."
              className="w-full rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-sky-500/70 md:w-72"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="w-full rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-sm text-zinc-200 outline-none focus:border-sky-500/70 md:w-auto"
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
          <button
            type="button"
            onClick={handleAdminExport}
            disabled={downloading}
            className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? 'Preparing CSV...' : 'Download Admin Data'}
          </button>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2.6fr)_minmax(320px,1fr)] xl:items-stretch">
          <div className="w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40 shadow-sm shadow-black/40">
            <div className="border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Requests ({filtered.length})
            </div>
            <div className="overflow-hidden">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[24%]" />
                  <col className="w-[11%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur">
                  <tr className="border-b border-zinc-800/80 text-xs uppercase tracking-[0.16em] text-zinc-500">
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Requester</th>
                    <th className="px-3 py-2 text-left font-medium">Created</th>
                    <th className="px-3 py-2 text-left font-medium">Project Title</th>
                    <th className="px-3 py-2 text-left font-medium">Institution</th>
                    <th className="px-3 py-2 text-left font-medium">Collaborators</th>
                    <th className="px-3 py-2 text-left font-medium">Country</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-sm text-zinc-500"
                      >
                        Loading requests...
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-[11px] text-zinc-500"
                      >
                        No requests match the current filters.
                      </td>
                    </tr>
                  )}
                  {currentSlice.map((r) => {
                    const collaboratorCount =
                      r.collaboratorCount ?? r.collaborators?.length ?? 0;
                    return (
                      <tr
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/demos/data-access-portal/admin/${r.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/demos/data-access-portal/admin/${r.id}`);
                          }
                        }}
                        className="border-t border-zinc-900/80 transition hover:bg-zinc-900/60 focus-visible:outline focus-visible:outline-emerald-500/50 cursor-pointer"
                      >
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_COLORS[r.status]}`}
                          title={r.status.replace('_', ' ')}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span
                            className="truncate font-medium text-zinc-50"
                            title={r.piName}
                          >
                            {r.piName}
                          </span>
                          <span
                            className="truncate font-mono text-xs text-zinc-500"
                            title={r.piEmail}
                          >
                            {r.piEmail}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top whitespace-nowrap">
                        <span
                          className="block truncate text-sm text-zinc-400"
                          title={new Date(r.createdAt).toLocaleString()}
                        >
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className="block truncate text-sm text-zinc-200"
                          title={r.projectTitle ?? 'No project title'}
                        >
                          {r.projectTitle ?? 'Untitled project'}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className="block truncate text-sm text-zinc-200"
                          title={r.institution}
                        >
                          {r.institution}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {collaboratorCount > 0 ? (
                          <span className="font-mono text-xs text-zinc-200">
                            {collaboratorCount}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="block truncate text-sm text-zinc-300">
                          {r.country}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-900 px-4 py-3 text-sm text-zinc-400">
              <span>
                Showing{' '}
                {filtered.length === 0
                  ? 0
                  : (currentPage - 1) * ITEMS_PER_PAGE + 1}{' '}
                -
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of{' '}
                {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange('prev')}
                  disabled={currentPage === 1}
                  className="rounded-full border border-zinc-800 px-4 py-1.5 text-sm text-zinc-200 transition hover:border-sky-500/70 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-zinc-500">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange('next')}
                  disabled={currentPage === totalPages}
                  className="rounded-full border border-zinc-800 px-4 py-1.5 text-sm text-zinc-200 transition hover:border-sky-500/70 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-full w-full min-h-0 flex-col gap-4 lg:gap-5">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <SummaryCard
                label="Submitted"
                value={statusSummary.SUBMITTED ?? 0}
                accent="text-zinc-200"
              />
              <SummaryCard
                label="In review"
                value={statusSummary.IN_REVIEW ?? 0}
                accent="text-sky-300"
              />
              <SummaryCard
                label="Approved"
                value={statusSummary.APPROVED ?? 0}
                accent="text-emerald-300"
              />
              <SummaryCard
                label="Denied"
                value={statusSummary.DENIED ?? 0}
                accent="text-red-300"
              />
            </div>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                <p>Requests per month</p>
                <span className="text-[10px] font-semibold text-zinc-500">
                  Last 6 months
                </span>
              </div>
              <div className="mt-5 flex h-40 items-end justify-between gap-3 sm:h-48">
                {monthlySummary.map((bucket) => {
                  const height = Math.max(20, (bucket.count / monthlyMax) * 120);
                  return (
                    <div
                      key={bucket.label}
                      className="flex flex-1 flex-col items-center gap-1 text-[11px] text-zinc-500"
                    >
                      <div
                        className="w-7 rounded-[999px] bg-gradient-to-t from-zinc-900 via-emerald-600/60 to-emerald-400/80 shadow-inner shadow-black/40"
                        style={{ height: `${height}px` }}
                        title={`${bucket.count} requests`}
                      />
                      <span>{bucket.label}</span>
                      <span className="font-semibold text-zinc-200">{bucket.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <FunnelCard
              totalRequests={totalRequests}
              submittedCount={submittedCount}
              inReviewCount={inReviewCount}
              approvedCount={approvedCount}
              deniedCount={deniedCount}
              pendingDecisions={pendingDecisions}
            />
          </div>
        </div>
      </div>
    </PortalPageShell>
  );
}

function FunnelCard({
  totalRequests,
  submittedCount,
  inReviewCount,
  approvedCount,
  deniedCount,
  pendingDecisions,
}: {
  totalRequests: number;
  submittedCount: number;
  inReviewCount: number;
  approvedCount: number;
  deniedCount: number;
  pendingDecisions: number;
}) {
  const funnelStages = [
    {
      key: 'total',
      title: 'Requests received',
      segments: [
        {
          label: 'Total',
          value: totalRequests,
          color: 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300',
        },
      ],
      total: totalRequests,
      relativeTo: totalRequests,
      offsetPercent: 0,
    },
    {
      key: 'pipeline',
      title: 'Pipeline status',
      segments: [
        {
          label: 'Submitted',
          value: submittedCount,
          color: 'bg-gradient-to-r from-zinc-700 to-zinc-600',
        },
        {
          label: 'In Review',
          value: inReviewCount,
          color: 'bg-gradient-to-r from-sky-600 to-sky-400',
        },
        {
          label: 'Approved',
          value: approvedCount,
          color: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
        },
        {
          label: 'Denied',
          value: deniedCount,
          color: 'bg-gradient-to-r from-rose-600 to-rose-400',
        },
      ],
      total: totalRequests,
      relativeTo: totalRequests,
      offsetPercent: 0,
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
        Request funnel
      </p>
      <div className="mt-5 space-y-6 text-sm text-zinc-400">
        {funnelStages.map((stage) => {
          const relativePercent =
            stage.relativeTo > 0 ? Math.min(100, (stage.total / stage.relativeTo) * 100) : 0;
          const offsetPercent = stage.offsetPercent ?? 0;
          return (
            <div key={stage.key} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <p>{stage.title}</p>
              </div>
              <div className="relative h-5 w-full rounded-full bg-zinc-950/60 shadow-inner shadow-black/30">
                <div
                  className="absolute inset-y-0 flex overflow-hidden rounded-full"
                  style={{
                    width: `${relativePercent}%`,
                    left: `${offsetPercent}%`,
                  }}
                >
                  {stage.segments.map((segment) => {
                    const percent =
                      stage.total > 0
                        ? Math.max(0, (segment.value / stage.total) * 100)
                        : 0;
                    return (
                      <div
                        key={segment.label}
                        className={`${segment.color}`}
                        style={{ width: `${percent}%` }}
                        title={`${stage.title}: ${segment.value} ${segment.label.toLowerCase()}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
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
