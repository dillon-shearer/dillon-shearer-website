'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GymDatasetSlug } from '@/types/data-access-portal';
import {
  DATASET_DISPLAY_ORDER,
  DATASET_LEVEL_LABELS,
  PRIMARY_DATASET_LEVEL,
} from '@/lib/gym-datasets';

type AllowedDataset = {
  slug: GymDatasetSlug;
  label: string;
  description?: string | null;
  level?: number | null;
};

type UnlockResponse = {
  request: {
    id: string;
    piName: string;
    projectTitle?: string | null;
    datasets: AllowedDataset[];
  };
};

const DATASET_SORT_RANK = Object.fromEntries(
  DATASET_DISPLAY_ORDER.map((slug, index) => [slug, index])
) as Record<GymDatasetSlug, number>;

export default function DataDownloadPage() {
  const [apiKey, setApiKey] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<UnlockResponse['request'] | null>(
    null
  );
  const [loadingDataset, setLoadingDataset] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const sortedApprovedDatasets = requestInfo
    ? [...requestInfo.datasets].sort(
        (a, b) =>
          (DATASET_SORT_RANK[a.slug] ?? Number.MAX_SAFE_INTEGER) -
          (DATASET_SORT_RANK[b.slug] ?? Number.MAX_SAFE_INTEGER)
      )
    : [];

  const formatDatasetScope = (dataset: AllowedDataset) => {
    const canonicalLevel =
      PRIMARY_DATASET_LEVEL[dataset.slug as keyof typeof PRIMARY_DATASET_LEVEL] ??
      dataset.level ??
      1;
    const rawLabel =
      DATASET_LEVEL_LABELS[dataset.slug as keyof typeof DATASET_LEVEL_LABELS] ?? '';
    const summary = rawLabel.includes('-')
      ? rawLabel
          .split('-')
          .slice(1)
          .join('-')
          .trim()
      : rawLabel.replace(/^Level\s*\d+\s*/i, '').trim();
    const suffix = summary || 'Dataset scope';
    return `Level ${canonicalLevel} - ${suffix}`;
  };

  const handleUnlock = async () => {
    setUnlockError(null);
    setDownloadMessage(null);

    if (!apiKey.trim()) {
      setUnlockError('Enter the API key that was issued after approval.');
      return;
    }

    setUnlocking(true);
    try {
      const res = await fetch('/api/data-access-portal/gym-data/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to unlock datasets');
      setRequestInfo(json.request as UnlockResponse['request']);
    } catch (err: any) {
      setUnlockError(err.message ?? 'Could not unlock datasets with that key.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleDatasetDownload = async (dataset: GymDatasetSlug) => {
    if (!requestInfo) return;
    setLoadingDataset(dataset);
    setDownloadMessage(null);
    try {
      const url = new URL(window.location.origin + '/api/data-access-portal/gym-data');
      url.searchParams.set('dataset', dataset);
      url.searchParams.set('format', 'csv');

      const res = await fetch(url.toString(), {
        headers: { 'x-api-key': apiKey },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to fetch dataset');
      }

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${dataset}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setDownloadMessage(`Downloaded ${dataset}.csv`);
    } catch (err: any) {
      setDownloadMessage(err.message ?? 'Failed to fetch dataset.');
    } finally {
      setLoadingDataset(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Demo - Data Download
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
              Download Approved Gym Data
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Enter an API key issued from the admin view. I'll unlock the datasets tied to
              that approval so you can preview the JSON payload or export a CSV instantly.
            </p>
          </div>
          <Link
            href="/demos/data-access-portal"
            className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
          >
            Back to portal
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 shadow-sm shadow-black/40">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-300">API Key</label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500/70"
                  placeholder="dar_xxx..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-[11px] text-zinc-500">
                  Paste the key you copied from the admin approval screen.
                </p>
              </div>
              <button
                type="button"
                disabled={unlocking || !apiKey.trim()}
                onClick={handleUnlock}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-zinc-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
              >
                {unlocking ? 'Unlocking...' : 'Unlock datasets'}
              </button>
              {unlockError && (
                <p className="text-[11px] text-red-400">{unlockError}</p>
              )}
              {requestInfo && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100">
                  <p>
                    <span className="font-medium text-emerald-300">Requester:</span>{' '}
                    {requestInfo.piName}
                  </p>
                  <p>
                    <span className="font-medium text-emerald-300">Project:</span>{' '}
                    {requestInfo.projectTitle || 'Untitled'}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-[11px] text-zinc-300">
              <p className="text-[11px] font-medium text-zinc-200">Reminder</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-zinc-400">
                <li>Keys are tied to a single request. Rotating decisions invalidates old keys.</li>
                <li>I only surface datasets your approval actually covers.</li>
                <li>Preview JSON inline or download CSV for quick analysis.</li>
              </ul>
            </div>
          </div>

          {requestInfo && (
            <div className="mt-6 space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                Approved datasets
              </p>
              <p className="text-[11px] text-zinc-400">
                Each card shows the Level 1, 2, or 3 scope tied to this API key so the download experience mirrors the approval.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {sortedApprovedDatasets.map((dataset) => {
                  const loadingCsv = loadingDataset === dataset.slug;
                  const scopeLabel = formatDatasetScope(dataset);
                  return (
                    <div
                      key={dataset.slug}
                      className="flex h-full flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-zinc-50">
                            {dataset.label}
                          </h3>
                          <span className="text-[10px] uppercase text-emerald-300">
                            {scopeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {dataset.description || 'Approved slice of the gym dataset.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDatasetDownload(dataset.slug)}
                        disabled={loadingCsv}
                        className="mt-4 rounded-full border border-emerald-500/60 px-3 py-1.5 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingCsv ? 'Preparing...' : 'Download CSV'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {downloadMessage && (
            <p className="mt-4 text-[11px] text-zinc-400">{downloadMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
