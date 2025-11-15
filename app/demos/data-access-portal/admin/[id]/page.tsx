'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type {
  DarRequest,
  DarRequestStatus,
  DarVisualizationPreset,
} from '@/types/data-access-portal';
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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VISUAL_PRESETS: { id: DarVisualizationPreset; label: string; description: string }[] = [
  {
    id: 'split-all-time',
    label: 'Split by gender',
    description: 'Compare male vs female registered athletes for the last 24 months.',
  },
  {
    id: 'volume-all-time',
    label: 'Set volume',
    description: 'Stacked bar showing total sets logged per discipline monthly.',
  },
  {
    id: 'rep-all-time',
    label: 'Average reps',
    description: 'Rolling 3 month average of reps per set across all gyms.',
  },
  {
    id: 'training-days-all-time',
    label: 'Training days',
    description: 'Line chart showing average number of training days per week.',
  },
];

const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());

const resolveCountryInput = (value: string) => {
  if (!value) return null;
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  return (
    COUNTRY_OPTIONS.find(
      (option) => option.toLowerCase() === needle
    ) ?? null
  );
};

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

type AuditEvent = {
  label: string;
  timestamp: string;
  description: string;
  meta?: string | null;
};

function buildAuditTrail(request?: DarRequest | null): AuditEvent[] {
  if (!request) return [];

  if (request.statusEvents && request.statusEvents.length > 0) {
    return request.statusEvents
      .map((event) => ({
        label: event.status.replace(/_/g, ' '),
        timestamp: event.createdAt,
        description: event.description || '',
        meta: event.metadata,
      }))
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }

  const events: AuditEvent[] = [];
  const add = (
    timestamp: string | null | undefined,
    label: string,
    description: string,
    meta?: string | null
  ) => {
    if (!timestamp) return;
    events.push({ label, timestamp, description, meta });
  };

  add(
    request.createdAt,
    'Submitted',
    `${request.piName} submitted the request.`
  );

  add(
    request.approvedAt,
    'Approved',
    `Approved by ${request.approvedBy ?? 'demo-admin'}.`,
    request.apiKeyIssuedAt ? 'API key was minted at approval.' : null
  );

  add(
    request.deniedAt,
    'Denied',
    request.deniedReason ? `Reason: ${request.deniedReason}` : 'Request denied.',
    request.deniedBy ? `By ${request.deniedBy}` : null
  );

  add(
    request.revokedAt,
    'Access revoked',
    request.revokedBy ? `Revoked by ${request.revokedBy}.` : 'Access revoked.'
  );

  if (request.apiKeyIssuedAt && request.apiKeyIssuedAt !== request.approvedAt) {
    add(
      request.apiKeyIssuedAt,
      'API key minted',
      'Scoped credentials issued to the requester.'
    );
  }

  return events.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function AuditTrailDrawer({
  trail,
  onClose,
}: {
  trail: AuditEvent[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 py-10 text-zinc-50 sm:items-center">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Audit trail
            </p>
            <h3 className="text-lg font-semibold text-zinc-50">
              Decision history
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-800 px-3 py-1 text-[11px] text-zinc-200 hover:border-emerald-500/70 hover:text-emerald-200"
          >
            Close
          </button>
        </div>
        <div className="mt-6 max-h-[60vh] space-y-5 overflow-y-auto pr-2">
          {trail.length === 0 ? (
            <p className="text-sm text-zinc-400">No audit events recorded yet.</p>
          ) : (
            trail.map((event, index) => (
              <div key={`${event.label}-${event.timestamp}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="mt-1 block h-3 w-3 rounded-full bg-emerald-400" />
                  {index !== trail.length - 1 && (
                    <span className="mt-1 block h-full w-px flex-1 bg-zinc-800" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-100">{event.label}</p>
                  <p className="text-[11px] text-zinc-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm text-zinc-300">{event.description}</p>
                  {event.meta && (
                    <p className="text-xs text-zinc-500">{event.meta}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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
  const formErrorRef = useRef<HTMLDivElement | null>(null);

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
  const [auditOpen, setAuditOpen] = useState(false);
  const [vizPresetSelections, setVizPresetSelections] = useState<
    Record<DarVisualizationPreset, boolean>
  >({});
  const [deliverablesDirty, setDeliverablesDirty] = useState(false);
  const [customDeliveryStatusDraft, setCustomDeliveryStatusDraft] = useState<
    'pending' | 'fulfilled' | 'rejected' | null
  >(null);
  const [customDeliveryNoteDraft, setCustomDeliveryNoteDraft] = useState('');

  const hydrateFormFromRequest = (r: DarRequest) => {
    setRequest(r);
    const nameParts = splitName(r.piName);
    setForm({
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      email: r.piEmail,
      phone: r.piPhone ?? '',
      institution: r.institution,
      country: resolveCountryInput(r.country) ?? r.country,
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
    const presetMap: Record<DarVisualizationPreset, boolean> = {};
    (r.visualizationPresets ?? []).forEach((preset) => {
      presetMap[preset] = true;
    });
    setVizPresetSelections(presetMap);
    setCustomDeliveryStatusDraft(
      r.customDeliveryStatus ?? (r.visualizationCustomRequest ? 'pending' : null)
    );
    setCustomDeliveryNoteDraft(r.customDeliveryNote ?? '');
    setDeliverablesDirty(false);
  };

  const auditTrail = useMemo(() => buildAuditTrail(request), [request]);

  useEffect(() => {
    setApiKey(null);
    setApiKeyCopyState('idle');
  }, [id]);

  useEffect(() => {
    if (formError && formErrorRef.current) {
      formErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [formError]);

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

  const handleVizPresetToggle = (presetId: DarVisualizationPreset) => {
    setVizPresetSelections((prev) => {
      const next = { ...prev };
      if (next[presetId]) {
        delete next[presetId];
      } else {
        next[presetId] = true;
      }
      return next;
    });
    setDeliverablesDirty(true);
  };

  const markCustomDeliveryStatus = (status: 'pending' | 'fulfilled' | 'rejected') => {
    if (!request?.visualizationCustomRequest) return;
    setCustomDeliveryStatusDraft(status);
    if (status !== 'rejected') {
      setCustomDeliveryNoteDraft('');
    }
    setDeliverablesDirty(true);
  };

  const handleCustomDeliveryNoteChange = (value: string) => {
    setCustomDeliveryNoteDraft(value);
    setDeliverablesDirty(true);
  };

  const currentApiKey = apiKey ?? request?.apiKey ?? null;
  const selectedVizPresetsList = useMemo(
    () =>
      Object.entries(vizPresetSelections)
        .filter(([, active]) => active)
        .map(([key]) => key as DarVisualizationPreset),
    [vizPresetSelections]
  );

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

  const persistDeliverablesIfNeeded = async (base: DarRequest) => {
    if (!id) return base;
    const basePresets = base.visualizationPresets ?? [];
    const baseSorted = [...basePresets].sort();
    const selectedSorted = [...selectedVizPresetsList].sort();
    const presetsChanged =
      baseSorted.length !== selectedSorted.length ||
      selectedSorted.some((preset, index) => preset !== baseSorted[index]);
    const baseStatus =
      base.customDeliveryStatus ?? (base.visualizationCustomRequest ? 'pending' : null);
    const draftStatus =
      customDeliveryStatusDraft ?? (base.visualizationCustomRequest ? 'pending' : null);
    const baseNote = base.customDeliveryNote ?? '';
    const draftNote = customDeliveryNoteDraft.trim();
    if (!presetsChanged && baseStatus === draftStatus && baseNote === draftNote) {
      setDeliverablesDirty(false);
      return base;
    }
    const res = await fetch(`/api/data-access-portal/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-deliverables',
        visualizationPresets: selectedVizPresetsList,
        customDeliveryStatus: draftStatus ?? undefined,
        customDeliveryNote: draftStatus === 'rejected' ? draftNote : undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? 'Failed to update deliverables');
    }
    setDeliverablesDirty(false);
    return json.data as DarRequest;
  };

  const saveMetadata = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setFormError(null);

    try {
      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();
      const email = form.email.trim();
      const phone = form.phone.trim();
      const institution = form.institution.trim();
      const proposal = form.dataUseProposal.trim();
      const normalizedCountry = resolveCountryInput(form.country);
      const projectTitle = form.projectTitle.trim();

      if (!firstName || !lastName) {
        throw new Error('First and last name are required.');
      }
      if (!email) {
        throw new Error('Email is required.');
      }
      if (!isValidEmail(email)) {
        throw new Error('Provide a valid email address.');
      }
      if (!institution) {
        throw new Error('Institution is required.');
      }
      if (!normalizedCountry) {
        throw new Error('Country must be selected from the provided list.');
      }
      if (!proposal) {
        throw new Error('Data use proposal is required.');
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
        if (!isValidEmail(email)) {
          throw new Error(`Collaborator ${index + 1} email must look like name@domain.com.`);
        }
        return {
          firstName: first,
          lastName: last,
          email,
          phone: collab.phone.trim() || null,
        };
      });

      const piName = `${firstName} ${lastName}`.trim();

      const res = await fetch(`/api/data-access-portal/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          patch: {
            piName,
            piEmail: email,
            piPhone: phone || null,
            institution,
            country: normalizedCountry,
            projectTitle: projectTitle || null,
            dataUseProposal: proposal,
            plannedStart: form.plannedStart,
            plannedEnd: form.plannedEnd,
          },
          datasets: selectedDatasets,
          collaborators: collaboratorsPayload,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save');

      let latest = json.data as DarRequest;
      latest = await persistDeliverablesIfNeeded(latest);
      hydrateFormFromRequest(latest);
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
    <div className="min-h-screen bg-black text-zinc-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12">
        {loading ? (
          <p className="text-xs text-zinc-500">Loading request...</p>
        ) : !request ? (
          <p className="text-xs text-red-400">Request not found.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/50 p-5 shadow-inner shadow-black/20">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Demo - Admin - Request
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
                    {request.piName}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-400">{request.institution}</p>
                  <p className="text-[11px] text-zinc-500">
                    <span className="font-mono">{request.piEmail}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-[5px] font-medium ${STATUS_COLORS[request.status]}`}
                    >
                      {request.status.replace('_', ' ')}
                    </span>
                    <span className="text-zinc-500">
                      Updated {new Date(request.statusLastChangedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 text-right">
                  <Link
                    href="/demos/data-access-portal/admin"
                    className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
                  >
                    Back to admin view
                  </Link>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAuditOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
                    >
                      View audit trail
                    </button>
                    <button
                      type="button"
                      onClick={saveMetadata}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-medium text-zinc-950 shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}
            {formError && (
              <div
                ref={formErrorRef}
                className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200"
              >
                {formError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                  Intake details
                </h2>
                <div className="mt-3 space-y-6">
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

                  {/* Visualization package */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-zinc-100">Visualization package</h3>
                      <span className="text-[11px] text-zinc-500">
                        {request.visualizationPresets?.length || request.visualizationCustomRequest
                          ? 'Requested'
                          : 'Not requested'}
                      </span>
                    </div>
                    {(!request.visualizationPresets ||
                      request.visualizationPresets.length === 0) &&
                      !request.visualizationCustomRequest && (
                        <p className="text-xs text-zinc-500">
                          No visualization package was requested, but you can still toggle presets if you plan to deliver
                          any.
                        </p>
                      )}
                    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-[11px] text-zinc-400">
                        Toggle presets to control which visuals you&apos;ll deliver. Changes save when you click the main
                        Save button at the top.
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        {VISUAL_PRESETS.map((preset) => {
                          const active = !!vizPresetSelections[preset.id];
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleVizPresetToggle(preset.id)}
                              className={`flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition ${
                                active
                                  ? 'border-emerald-500/70 bg-emerald-500/5 shadow-inner shadow-emerald-500/20'
                                  : 'border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/40 hover:text-emerald-100'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                  <h4 className="text-sm font-semibold text-zinc-50">{preset.label}</h4>
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      active ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : 'bg-zinc-700'
                                    }`}
                                  />
                                </div>
                                <p className="text-xs text-zinc-400">{preset.description}</p>
                              </div>
                              <p className="mt-3 text-[11px] text-zinc-400">
                                {active ? 'Selected' : 'Tap to include this visual'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                      {deliverablesDirty && (
                        <p className="text-[11px] text-amber-300">
                          Visualization changes are pending. Click Save details above to push them live.
                        </p>
                      )}
                      {request.visualizationCustomRequest && (
                        <div className="space-y-2 rounded-xl border border-sky-500/50 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-sky-200">Custom ask</p>
                              <p className="mt-1 text-sky-100">{request.visualizationCustomRequest}</p>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-[1px] text-[10px] font-medium ${
                                (customDeliveryStatusDraft ?? 'pending') === 'fulfilled'
                                  ? 'border-emerald-500/50 text-emerald-200'
                                  : customDeliveryStatusDraft === 'rejected'
                                    ? 'border-red-500/50 text-red-200'
                                    : 'border-yellow-500/50 text-yellow-200'
                              }`}
                            >
                              {customDeliveryStatusDraft === 'fulfilled'
                                ? 'Fulfilled'
                                : customDeliveryStatusDraft === 'rejected'
                                  ? 'Rejected'
                                  : 'Pending'}
                            </span>
                          </div>
                          <p className="text-[10px] text-sky-200">
                            Promise delivery via email within 3-5 business days. Update the status once you send the bundle
                            or reject the request.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => markCustomDeliveryStatus('pending')}
                              className="rounded-full border border-sky-400/70 px-3 py-1 text-[10px] font-medium text-sky-100 transition hover:border-sky-300"
                            >
                              Mark pending
                            </button>
                            <button
                              type="button"
                              onClick={() => markCustomDeliveryStatus('fulfilled')}
                              className="rounded-full border border-emerald-400/70 px-3 py-1 text-[10px] font-medium text-emerald-100 transition hover:border-emerald-300"
                            >
                              Mark fulfilled
                            </button>
                            <button
                              type="button"
                              onClick={() => markCustomDeliveryStatus('rejected')}
                              className="rounded-full border border-red-400/70 px-3 py-1 text-[10px] font-medium text-red-100 transition hover:border-red-300"
                            >
                              Reject custom ask
                            </button>
                          </div>
                          {customDeliveryStatusDraft === 'rejected' && (
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-[0.2em] text-sky-200">
                                Rejection reason (shown to requester)
                              </label>
                              <textarea
                                className="min-h-[80px] w-full rounded-lg border border-sky-500/40 bg-black/30 px-3 py-2 text-[11px] text-sky-100 outline-none focus:border-sky-400"
                                value={customDeliveryNoteDraft}
                                onChange={(e) => handleCustomDeliveryNoteChange(e.target.value)}
                                placeholder="Explain why this custom package can’t be fulfilled."
                              />
                              {!customDeliveryNoteDraft.trim() && (
                                <p className="text-[10px] text-yellow-200">
                                  Provide a note before rejecting—this message appears in the download room.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {request.visualizationPalette && request.visualizationPalette.length > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          Palette:
                          {request.visualizationPalette.slice(0, 5).map((color) => (
                            <span
                              key={color}
                              className="h-4 w-4 rounded-full border border-zinc-800"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      )}
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
              </div>

              <div className="space-y-4 lg:sticky lg:top-24">
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

            {auditOpen && (
              <AuditTrailDrawer
                trail={auditTrail}
                onClose={() => setAuditOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
