'use client';

import { useState } from 'react';

type GymDataResponse = {
  dataset: string;
  level: number;
  note: string;
  exampleShape?: any;
};

export default function DataDownloadPage() {
  const [apiKey, setApiKey] = useState('');
  const [dataset, setDataset] = useState('workout_sessions');
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GymDataResponse | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const url = new URL(window.location.origin + '/api/data-access-portal/gym-data');
      url.searchParams.set('dataset', dataset);
      url.searchParams.set('level', String(level));

      const res = await fetch(url.toString(), {
        headers: {
          'x-api-key': apiKey,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to fetch data');

      setResult(json.data as GymDataResponse);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Demo • Data Download
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
            Download Approved Gym Data
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            Paste an API key issued from the admin panel, choose a dataset scope, and pull
            only the slices of the gym dataset that were approved for that request.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 shadow-sm shadow-black/40">
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-300">
                  API Key
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500/70"
                  placeholder="dar_xxx..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-[11px] text-zinc-500">
                  This is the key generated when the admin approved your Data Access
                  Request.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-300">
                    Dataset
                  </label>
                  <select
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                    value={dataset}
                    onChange={(e) => setDataset(e.target.value)}
                  >
                    <option value="workout_sessions">Workout Sessions</option>
                    <option value="set_metrics">Set-Level Metrics</option>
                    <option value="body_metrics">Body Metrics</option>
                    <option value="aggregates">Aggregated Summaries</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-300">
                    Level
                  </label>
                  <select
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                  >
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                    <option value={4}>Level 4</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={loading || !apiKey}
                onClick={fetchData}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-zinc-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
              >
                {loading ? 'Fetching...' : 'Fetch data'}
              </button>

              {error && (
                <p className="mt-2 text-[11px] text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-[11px] text-zinc-300">
              <p className="text-[11px] font-medium text-zinc-200">
                How this works
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-zinc-400">
                <li>
                  The API key is tied to a specific Data Access Request and approval
                  decision.
                </li>
                <li>
                  The server validates the key, checks that the request is{' '}
                  <span className="text-emerald-300">APPROVED</span>, and has not been{' '}
                  <span className="text-amber-300">REVOKED</span>.
                </li>
                <li>
                  The request&apos;s dataset scopes mirror the &quot;which data types do
                  you want?&quot; section in the intake form.
                </li>
                <li>
                  In my real workflow, this same pattern gates biomedical cohorts instead
                  of gym data.
                </li>
              </ul>
            </div>
          </div>

          {result && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
              <p className="text-[11px] font-medium text-zinc-200">
                Response (shape)
              </p>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/60 p-3 text-[10px] text-zinc-200">
                {JSON.stringify(result, null, 2)}
              </pre>
              <p className="mt-2 text-[11px] text-zinc-500">
                In your production pipeline, this would stream CSV/JSON from the same
                backing store that feeds the Gym Dashboard demo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
