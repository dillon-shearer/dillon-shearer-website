'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { DarRequest, DarRequestStatus } from '@/types/data-access-portal';
import {
  AVAILABLE_GYM_DATASETS,
  DATASET_LEVEL_LABELS,
  PRIMARY_DATASET_LEVEL,
} from '@/lib/gym-datasets';
import { COUNTRY_OPTIONS } from '@/lib/constants/countries';

const STATUS_COLORS: Record<DarRequestStatus, string> = {
  SUBMITTED: 'bg-zinc-800 text-zinc-100 border-zinc-700',
  IN_REVIEW: 'bg-sky-500/10 text-sky-300 border-sky-500/60',
  APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/60',
  DENIED: 'bg-red-500/10 text-red-300 border-red-500/60',
};

type AdminCollaboratorInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const MAX_FUTURE_DATE = '2999-12-31';
const datasetOptions = AVAILABLE_GYM_DATASETS;

const splitName = (fullName: string = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  const firstName = parts.shift() ?? '';
  const lastName = parts.join(' ');
  return { firstName, lastName };
};

const buildDatasetSelectionMap = (selected: string[] = []) => {
  const map: Record<string, boolean> = {};
  datasetOptions.forEach((ds) => {
    map[ds.slug] = selected.includes(ds.slug);
  });
  return map;
};

const normalizeDateInput = (value?: string | null) => {
  if (!value) return '';
  if (value.includes('T')) return value.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
};

export default function AdminRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [request, setRequest] = useState<DarRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyCopyState, setApiKeyCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );
  const [denialReason, setDenialReason] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    institution: '',
    country: '',
    projectTitle: '',
    dataUseProposal: '',
    plannedStart: '',
    plannedEnd: '',
  });
  const [datasetSelections, setDatasetSelections] = useState<Record<string, boolean>>(
    () => buildDatasetSelectionMap()
  );
  const [collaboratorsForm, setCollaboratorsForm] = useState<AdminCollaboratorInput[]>([]);

  const hydrateFormFromRequest = (r: DarRequest) => {
    setRequest(r);
    const nameParts = splitName(r.piName);
    setForm({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: r.piEmail,
      phone: r.piPhone ?? '',
      institution: r.institution,
      country: r.country,
      projectTitle: r.projectTitle ?? '',
      dataUseProposal: r.dataUseProposal,
      plannedStart: normalizeDateInput(r.plannedStart),
      plannedEnd: normalizeDateInput(r.plannedEnd),
    });
    const initialSelection = buildDatasetSelectionMap(
      (r.requestedDatasets ?? []).map((ds) => ds.datasetSlug)
    );
    setDatasetSelections(initialSelection);
    setCollaboratorsForm(
      (r.collaborators ?? []).map((c) => {
        const { firstName, lastName } = splitName(c.name ?? '');
        return {
          firstName,
          lastName,
          email: c.email ?? '',
          phone: c.phone ?? '',
        };
      })
    );
    setDenialReason(r.deniedReason ?? '');
  };

  useEffect(() => {
    setApiKey(null);
    setApiKeyCopyState('idle');
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/data-access-portal/requests/${id}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        const r = json.data as DarRequest;
        hydrateFormFromRequest(r);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load request');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError(null);
  };

  const toggleDataset = (slug: string) => {
    setDatasetSelections((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
    setFormError(null);
  };

  const addCollaborator = () => {
    setCollaboratorsForm((prev) => [
      ...prev,
      { firstName: '', lastName: '', email: '', phone: '' },
    ]);
    setFormError(null);
  };

  const updateCollaborator = (
    index: number,
    field: keyof AdminCollaboratorInput,
    value: string
  ) => {
    setCollaboratorsForm((prev) =>
      prev.map((collab, i) => (i === index ? { ...collab, [field]: value } : collab))
    );
    setFormError(null);
  };

  const removeCollaborator = (index: number) => {
    setCollaboratorsForm((prev) => prev.filter((_, i) => i !== index));
    setFormError(null);
  };

  const currentApiKey = apiKey ?? request?.apiKey ?? null;

  const copyApiKeyToClipboard = async () => {
    if (!currentApiKey) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentApiKey);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentApiKey;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setApiKeyCopyState('copied');
    } catch (err) {
      console.error('Failed to copy API key', err);
      setApiKeyCopyState('error');
    }
  };

  const saveMetadata = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setFormError(null);

    try {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        throw new Error('First and last name are required.');
      }
      if (!form.plannedStart || !form.plannedEnd) {
        throw new Error('Planned start and end dates are required.');
      }

      const startDate = new Date(form.plannedStart);
      const endDate = new Date(form.plannedEnd);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(MAX_FUTURE_DATE);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('Provide valid planned project dates.');
      }
      if (endDate < today) {
        throw new Error('Planned end date cannot be in the past.');
      }
      if (endDate > maxDate) {
        throw new Error('Planned end date is too far in the future.');
      }
      if (startDate > endDate) {
        throw new Error('End date must be after the start date.');
      }

      const selectedDatasets = Object.entries(datasetSelections)
        .filter(([, isSelected]) => isSelected)
        .map(([slug]) => ({
          datasetSlug: slug,
          level:
            PRIMARY_DATASET_LEVEL[slug as keyof typeof PRIMARY_DATASET_LEVEL] ?? 1,
        }));

      if (selectedDatasets.length === 0) {
        throw new Error('Select at least one dataset scope.');
      }

      const collaboratorsPayload = collaboratorsForm.map((collab, index) => {
        const first = collab.firstName.trim();
        const last = collab.lastName.trim();
        const email = collab.email.trim();
        if (!first || !last || !email) {
          throw new Error(`Collaborator ${index + 1} is missing required fields.`);
        }
        return {
          firstName: first,
          lastName: last,
          email,
          phone: collab.phone.trim() || null,
        };
      });

      const piName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

      const res = await fetch(`/api/data-access-portal/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          patch: {
            piName,
            piEmail: form.email,
            piPhone: form.phone || null,
            institution: form.institution,
            country: form.country,
            projectTitle: form.projectTitle || null,
            dataUseProposal: form.dataUseProposal,
            plannedStart: form.plannedStart,
            plannedEnd: form.plannedEnd,
          },
          datasets: selectedDatasets,
          collaborators: collaboratorsPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save');

      hydrateFormFromRequest(json.data as DarRequest);
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  const triggerDecision = async (action: 'approve' | 'deny' | 'revoke') => {
    if (!id || !request) return;
    setDecisionLoading(true);
    setError(null);
      setApiKey(null);
    setApiKeyCopyState('idle');

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
        setApiKeyCopyState('idle');
      }

      hydrateFormFromRequest(json.data as DarRequest);
    } catch (err: any) {
      setError(err.message ?? 'Failed to update request');
    } finally {
      setDecisionLoading(false);
    }
  };

  const canApprove =
    request &&
    (request.status === 'SUBMITTED' ||
      request.status === 'IN_REVIEW' ||
      request.status === 'DENIED');
  const canDeny =
    request &&
    (request.status === 'SUBMITTED' ||
      request.status === 'IN_REVIEW' ||
      request.status === 'APPROVED');
  const canRevoke = request && request.status === 'APPROVED';

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12">
        {loading ? (
          <p className="text-xs text-zinc-500">Loading request...</p>
        ) : !request ? (
          <p className="text-xs text-red-400">Request not found.</p>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Demo - Admin - Request
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
                  {request.piName}
                </h1>
                <p className="mt-2 text-xs text-zinc-400">
                  {request.institution} -{' '}
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
                <Link
                  href="/demos/data-access-portal/admin"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
                >
                  Back to admin view
                </Link>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 flex h-[720px] flex-col">
                <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                  Intake details
                </h2>
                <div className="mt-3 flex-1 space-y-6 overflow-y-auto pr-2">
                  {/* Contact */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-100">Contact</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-300">First name</label>
                        <input
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                          value={form.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-300">Last name</label>
                        <input
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                          value={form.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-300">Email</label>
                        <input
                          type="email"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                          value={form.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-300">Phone (optional)</label>
                        <input
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                          value={form.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Affiliation */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-100">Affiliation</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-300">Institution</label>
                        <input
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                          value={form.institution}
                          onChange={(e) => handleInputChange('institution', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-300">Country</label>
                        <select
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                          value={form.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                        >
                          <option value="">Select a country</option>
                          {COUNTRY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Project */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-100">Project</h3>
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-300">
                          Project title <span className="text-[10px] text-zinc-500">(optional)</span>
                        </label>
                        <input
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                          value={form.projectTitle}
                          onChange={(e) => handleInputChange('projectTitle', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-zinc-300">Data use proposal</label>
                        <textarea
                          className="min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                          value={form.dataUseProposal}
                          onChange={(e) => handleInputChange('dataUseProposal', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-zinc-300">Planned start</label>
                          <input
                            type="date"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                            value={form.plannedStart}
                            onChange={(e) => handleInputChange('plannedStart', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-zinc-300">Planned end</label>
                          <input
                            type="date"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                            value={form.plannedEnd}
                            onChange={(e) => handleInputChange('plannedEnd', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Data requested */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-100">Data requested</h3>
                    <p className="text-xs text-zinc-400">
                      Toggle the datasets that should remain approved for this request. Each badge highlights the Level 1, 2, or 3 scope that stays in sync with the API.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {datasetOptions.map((ds) => {
                        const selected = !!datasetSelections[ds.slug];
                        return (
                          <button
                            type="button"
                            key={ds.slug}
                            onClick={() => toggleDataset(ds.slug)}
                            className={`flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition ${
                              selected
                                ? 'border-emerald-500/70 bg-emerald-500/5 shadow-inner shadow-emerald-500/20'
                                : 'border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/40 hover:text-emerald-100'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="text-sm font-semibold text-zinc-50">{ds.label}</h4>
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    selected ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : 'bg-zinc-700'
                                  }`}
                                />
                              </div>
                              <p className="text-[11px] font-medium text-emerald-300">
                                {DATASET_LEVEL_LABELS[ds.slug as keyof typeof DATASET_LEVEL_LABELS]}
                              </p>
                              <p className="text-xs text-zinc-400">{ds.description}</p>
                            </div>
                            <p className="mt-3 text-[11px] text-zinc-400">
                              {selected ? 'Selected' : 'Tap to include this dataset'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Collaborators */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-zinc-100">Collaborators</h3>
                      <button
                        type="button"
                        onClick={addCollaborator}
                        className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-emerald-500/70 hover:text-emerald-300"
                      >
                        + Add collaborator
                      </button>
                    </div>
                    {collaboratorsForm.length === 0 && (
                      <p className="text-xs text-zinc-500">
                        Optional. Add anyone else who should share this approval.
                      </p>
                    )}
                    <div className="space-y-3">
                      {collaboratorsForm.map((collab, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-medium text-zinc-300">
                              Collaborator {index + 1}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeCollaborator(index)}
                              className="text-[11px] text-zinc-500 hover:text-red-400"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-4">
                            <input
                              placeholder="First name"
                              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                              value={collab.firstName}
                              onChange={(e) => updateCollaborator(index, 'firstName', e.target.value)}
                            />
                            <input
                              placeholder="Last name"
                              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                              value={collab.lastName}
                              onChange={(e) => updateCollaborator(index, 'lastName', e.target.value)}
                            />
                            <input
                              placeholder="Email"
                              type="email"
                              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                              value={collab.email}
                              onChange={(e) => updateCollaborator(index, 'email', e.target.value)}
                            />
                            <input
                              placeholder="Phone (optional)"
                              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                              value={collab.phone}
                              onChange={(e) => updateCollaborator(index, 'phone', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                {formError && (
                  <p className="mt-3 text-xs font-medium text-red-400">{formError}</p>
                )}
                <div className="mt-4 border-t border-zinc-900 pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={saveMetadata}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[11px] font-medium text-zinc-100 hover:border-sky-500/70 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>

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
                        <span className="text-zinc-500">Access revoked:</span>{' '}
                        {new Date(request.revokedAt).toLocaleString()} by{' '}
                        {request.revokedBy ?? 'demo-admin'}
                      </p>
                    )}
                  </div>

                  {request.status === 'DENIED' && (
                    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                      <span className="font-medium">Denial reason: </span>
                      {request.deniedReason ?? 'No reason provided.'}
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
                    <p className="mt-2 text-[11px] text-zinc-500">Applying decision...</p>
                  )}

                  <div className="mt-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-3 text-[11px] text-emerald-100">
                    <p className="font-medium text-emerald-200">API key access</p>
                    {currentApiKey ? (
                      <>
                        <p className="mt-1 text-[10px] text-emerald-200">
                          Click copy to send the key to your clipboard. The value stays hidden in the UI for safety.
                        </p>
                        <button
                          type="button"
                          onClick={copyApiKeyToClipboard}
                          className="mt-3 inline-flex items-center justify-center rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/20"
                        >
                          Copy API key
                        </button>
                        {apiKeyCopyState === 'copied' && (
                          <p className="mt-2 text-[10px] text-emerald-200">Copied to clipboard.</p>
                        )}
                        {apiKeyCopyState === 'error' && (
                          <p className="mt-2 text-[10px] text-red-200">
                            Unable to copy automatically. Please try again.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-[10px] text-emerald-200">
                        Approve this request to issue an API key. Once approved, you can copy it at any time.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
