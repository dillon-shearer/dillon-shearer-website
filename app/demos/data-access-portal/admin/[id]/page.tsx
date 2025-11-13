'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type {
  DarCollaborator,
  DarRequestedDataset,
  DarRequest,
  DarRequestStatus,
} from '@/types/data-access-portal';

const STATUS_COLORS: Record<DarRequestStatus, string> = {
  SUBMITTED: 'bg-zinc-800 text-zinc-100 border-zinc-700',
  IN_REVIEW: 'bg-sky-500/10 text-sky-300 border-sky-500/60',
  APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/60',
  DENIED: 'bg-red-500/10 text-red-300 border-red-500/60',
  REVOKED: 'bg-amber-500/10 text-amber-300 border-amber-500/60',
};

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [request, setRequest] = useState<DarRequest | null>(null);
  const [datasets, setDatasets] = useState<DarRequestedDataset[]>([]);
  const [collabs, setCollabs] = useState<DarCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [denialReason, setDenialReason] = useState('');

  const [editable, setEditable] = useState({
    piName: '',
    piEmail: '',
    piPhone: '',
    institution: '',
    country: '',
    projectTitle: '',
    dataUseProposal: '',
  });

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/data-access-portal/requests/${id}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        const r = json.data as DarRequest;
        setRequest(r);
        setDatasets(r.requestedDatasets ?? []);
        setCollabs(r.collaborators ?? []);
        setEditable({
          piName: r.piName,
          piEmail: r.piEmail,
          piPhone: r.piPhone ?? '',
          institution: r.institution,
          country: r.country,
          projectTitle: r.projectTitle,
          dataUseProposal: r.dataUseProposal,
        });
        setDenialReason(r.deniedReason ?? '');
      } catch (err: any) {
        setError(err.message ?? 'Failed to load request');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const updateField = (field: keyof typeof editable, value: string) => {
    setEditable((prev) => ({ ...prev, [field]: value }));
  };

  const saveMetadata = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/data-access-portal/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          patch: {
            piName: editable.piName,
            piEmail: editable.piEmail,
            piPhone: editable.piPhone || null,
            institution: editable.institution,
            country: editable.country,
            projectTitle: editable.projectTitle,
            dataUseProposal: editable.dataUseProposal,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save');
      setRequest(json.data as DarRequest);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  const triggerDecision = async (action: 'approve' | 'deny' | 'revoke') => {
    if (!id || !request) return;
    setDecisionLoading(true);
    setError(null);
    setApiKey(null);

    try {
      const body: any = { action };
      if (action === 'deny') {
        body.reason = denialReason || 'No reason provided';
      }

      const res = await fetch(`/api/data-access-portal/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to update');

      if (action === 'approve' && json.apiKey) {
        setApiKey(json.apiKey as string);
      }
      const updated = json.data as DarRequest;
      setRequest(updated);
    } catch (err: any) {
      setError(err.message ?? 'Failed to update request');
    } finally {
      setDecisionLoading(false);
    }
  };

  const canApprove = request && (request.status === 'SUBMITTED' || request.status === 'IN_REVIEW');
  const canDeny = request && (request.status === 'SUBMITTED' || request.status === 'IN_REVIEW');
  const canRevoke = request && request.status === 'APPROVED';

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12">
        {loading ? (
          <p className="text-xs text-zinc-500">Loading request...</p>
        ) : !request ? (
          <p className="text-xs text-red-400">Request not found.</p>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Demo • Admin • Request
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
                  {request.projectTitle || 'Untitled project'}
                </h1>
                <p className="mt-2 text-xs text-zinc-400">
                  {request.piName} · {request.institution} ·{' '}
                  <span className="font-mono text-[11px] text-zinc-500">{request.piEmail}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-[5px] text-[11px] font-medium ${STATUS_COLORS[request.status]}`}
                >
                  {request.status.replace('_', ' ')}
                </span>
                <span className="text-[11px] text-zinc-500">
                  Created {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}

            {/* Layout: metadata + decision columns */}
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
              {/* Left: editable metadata */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                  <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                    Identity & Project
                  </h2>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-300">Name</label>
                      <input
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70"
                        value={editable.piName}
                        onChange={(e) => updateField('piName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-300">Email</label>
                      <input
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70"
                        value={editable.piEmail}
                        onChange={(e) => updateField('piEmail', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-300">Phone</label>
                      <input
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70"
                        value={editable.piPhone}
                        onChange={(e) => updateField('piPhone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-300">Institution</label>
                      <input
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70"
                        value={editable.institution}
                        onChange={(e) => updateField('institution', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-300">Country</label>
                      <input
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70"
                        value={editable.country}
                        onChange={(e) => updateField('country', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-zinc-300">Project Title</label>
                      <input
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70"
                        value={editable.projectTitle}
                        onChange={(e) => updateField('projectTitle', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <label className="text-[11px] text-zinc-300">
                      Data Use Proposal
                    </label>
                    <textarea
                      className="min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-sky-500/70"
                      value={editable.dataUseProposal}
                      onChange={(e) => updateField('dataUseProposal', e.target.value)}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={saveMetadata}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[11px] font-medium text-zinc-100 hover:border-sky-500/70 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
                    >
                      {saving ? 'Saving...' : 'Save metadata'}
                    </button>
                  </div>
                </div>

                {/* Data + collaborators */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                  <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                    Data & Collaborators
                  </h2>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-zinc-200">
                        Requested datasets
                      </p>
                      {datasets.length === 0 ? (
                        <p className="text-[11px] text-zinc-500">
                          No dataset scopes recorded (should be populated via the public form).
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {datasets.map((d) => (
                            <li
                              key={d.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1.5"
                            >
                              <span className="text-[11px] text-zinc-200">
                                {d.datasetSlug}
                              </span>
                              <span className="rounded-full bg-zinc-900 px-2 py-[3px] text-[10px] text-zinc-400">
                                Level {d.level}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-zinc-200">
                        Collaborators
                      </p>
                      {collabs.length === 0 ? (
                        <p className="text-[11px] text-zinc-500">
                          None added on the intake form.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {collabs.map((c) => (
                            <li
                              key={c.id}
                              className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-[11px]"
                            >
                              <p className="font-medium text-zinc-100">{c.name}</p>
                              <p className="font-mono text-[10px] text-zinc-500">
                                {c.email}
                              </p>
                              {c.institution && (
                                <p className="text-[10px] text-zinc-400">
                                  {c.institution}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: decisions & API key */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                  <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                    Decision & Status
                  </h2>
                  <div className="mt-3 space-y-2 text-[11px] text-zinc-300">
                    <p>
                      <span className="text-zinc-500">Status:</span>{' '}
                      <span className="font-medium text-zinc-100">
                        {request.status.replace('_', ' ')}
                      </span>
                    </p>
                    <p>
                      <span className="text-zinc-500">Last updated:</span>{' '}
                      {new Date(request.statusLastChangedAt).toLocaleString()}
                    </p>
                    {request.approvedAt && (
                      <p>
                        <span className="text-zinc-500">Approved:</span>{' '}
                        {new Date(request.approvedAt).toLocaleString()} by{' '}
                        {request.approvedBy ?? 'demo-admin'}
                      </p>
                    )}
                    {request.deniedAt && (
                      <p>
                        <span className="text-zinc-500">Denied:</span>{' '}
                        {new Date(request.deniedAt).toLocaleString()} by{' '}
                        {request.deniedBy ?? 'demo-admin'}
                      </p>
                    )}
                    {request.revokedAt && (
                      <p>
                        <span className="text-zinc-500">Revoked:</span>{' '}
                        {new Date(request.revokedAt).toLocaleString()} by{' '}
                        {request.revokedBy ?? 'demo-admin'}
                      </p>
                    )}
                  </div>

                  {request.status === 'DENIED' && request.deniedReason && (
                    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                      <span className="font-medium">Denial reason: </span>
                      {request.deniedReason}
                    </div>
                  )}

                  <div className="mt-4 space-y-2">
                    <label className="text-[11px] text-zinc-300">
                      Denial reason (if denying)
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[11px] outline-none focus:border-red-500/70"
                      rows={3}
                      value={denialReason}
                      onChange={(e) => setDenialReason(e.target.value)}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canApprove || decisionLoading}
                      onClick={() => triggerDecision('approve')}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-zinc-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-400"
                    >
                      Approve & issue API key
                    </button>
                    <button
                      type="button"
                      disabled={!canDeny || decisionLoading}
                      onClick={() => triggerDecision('deny')}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-500/70 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-100 shadow-sm shadow-red-500/30 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-400"
                    >
                      Deny request
                    </button>
                    <button
                      type="button"
                      disabled={!canRevoke || decisionLoading}
                      onClick={() => triggerDecision('revoke')}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-amber-500/70 bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-100 shadow-sm shadow-amber-500/30 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-400"
                    >
                      Revoke access
                    </button>
                  </div>

                  {decisionLoading && (
                    <p className="mt-2 text-[11px] text-zinc-500">
                      Applying decision...
                    </p>
                  )}

                  {apiKey && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] text-emerald-200">
                        API key issued for this request. Copy this once and share it with
                        the requester:
                      </p>
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2">
                        <span className="flex-1 truncate font-mono text-[11px] text-emerald-100">
                          {apiKey}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(apiKey)}
                          className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-medium text-zinc-950 hover:bg-emerald-400"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        They can paste this on the Data Download page to unlock their
                        approved subset of the gym dataset.
                      </p>
                    </div>
                  )}

                  {request.apiKeyIssuedAt && !apiKey && (
                    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[11px] text-zinc-300">
                      API key already issued on{' '}
                      {new Date(request.apiKeyIssuedAt).toLocaleString()}.
                      <br />
                      For security, the raw key is only shown once at creation time.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
