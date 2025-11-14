'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AVAILABLE_GYM_DATASETS,
  DATASET_LEVEL_LABELS,
  PRIMARY_DATASET_LEVEL,
} from '@/lib/gym-datasets';
import { COUNTRY_OPTIONS } from '@/lib/constants/countries';

type CollaboratorInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export default function DataAccessRequestPage() {
  const datasetOptions = AVAILABLE_GYM_DATASETS;

  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [collaboratorError, setCollaboratorError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [piFirstName, setPiFirstName] = useState('');
  const [piLastName, setPiLastName] = useState('');
  const [piEmail, setPiEmail] = useState('');
  const [piPhone, setPiPhone] = useState('');
  const [institution, setInstitution] = useState('');
  const [country, setCountry] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [plannedStart, setPlannedStart] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [plannedEnd, setPlannedEnd] = useState('');
  const [selectedDatasets, setSelectedDatasets] = useState<Record<string, boolean>>({});
  const [collaborators, setCollaborators] = useState<CollaboratorInput[]>([]);

  const toggleDataset = (slug: string) => {
    setSelectedDatasets((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
    setDatasetError(null);
  };

  const addCollaborator = () => {
    setCollaborators((prev) => [
      ...prev,
      { firstName: '', lastName: '', email: '', phone: '' },
    ]);
    setCollaboratorError(null);
  };

  const updateCollaborator = (
    index: number,
    field: keyof CollaboratorInput,
    value: string
  ) => {
    setCollaborators((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
    setCollaboratorError(null);
  };

  const removeCollaborator = (index: number) => {
    setCollaborators((prev) => prev.filter((_, i) => i !== index));
    setCollaboratorError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessId(null);
    setDatasetError(null);
    setCollaboratorError(null);
    setDateError(null);
    setEmailError(null);

    try {
      const datasets = Object.entries(selectedDatasets)
        .filter(([, selected]) => selected)
        .map(([slug]) => ({
          datasetSlug: slug,
          level:
            PRIMARY_DATASET_LEVEL[slug as keyof typeof PRIMARY_DATASET_LEVEL] ?? 1,
        }));

      if (datasets.length === 0) {
        setDatasetError('Select at least one dataset.');
        setSubmitting(false);
        return;
      }

      if (!plannedEnd) {
        setDateError('Planned end date is required.');
        setSubmitting(false);
        return;
      }

      const startDate = new Date(plannedStart);
      const endDate = new Date(plannedEnd);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date('2999-12-31');

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        setDateError('Provide valid planned project dates.');
        setSubmitting(false);
        return;
      }

      if (endDate < today) {
        setDateError('Planned end date cannot be in the past.');
        setSubmitting(false);
        return;
      }

      if (endDate > maxDate) {
        setDateError('Planned end date is too far in the future.');
        setSubmitting(false);
        return;
      }

      if (startDate > endDate) {
        setDateError('End date must be after the start date.');
        setSubmitting(false);
        return;
      }

      const piName = [piFirstName.trim(), piLastName.trim()]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (!piName) {
        setError('First and last name are required.');
        setSubmitting(false);
        return;
      }

      const hasIncompleteCollaborator = collaborators.some(
        (c) =>
          !c.firstName.trim() || !c.lastName.trim() || !c.email.trim()
      );
      if (hasIncompleteCollaborator) {
        setCollaboratorError(
          'Fill first name, last name, and email for every collaborator or remove the row.'
        );
        setSubmitting(false);
        return;
      }

      const cleanCollaborators = collaborators.map((c) => ({
        name: `${c.firstName.trim()} ${c.lastName.trim()}`.trim(),
        email: c.email.trim(),
        phone: c.phone.trim() || undefined,
      }));

      const res = await fetch('/api/data-access-portal/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          piName,
          piEmail,
          piPhone: piPhone || undefined,
          institution,
          country,
          projectTitle: projectTitle || null,
          dataUseProposal: proposal,
          plannedStart: plannedStart || null,
          plannedEnd: plannedEnd || null,
          datasets,
          collaborators: cleanCollaborators,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to submit request');
      }

      const json = await res.json();
      setSuccessId(json.data.id);
    } catch (err: any) {
      const message = err.message ?? 'Something went wrong';
      if (message.toLowerCase().includes('already requested')) {
        setEmailError(message);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || datasetOptions.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Demo - Data Access Request
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
              Request Access to the Gym Dataset
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Mirror the same workflow I use with enterprise teams: capture who you are,
              why you need the data, and exactly which gym datasets should be unlocked.
            </p>
          </div>
          <Link
            href="/demos/data-access-portal"
            className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
          >
            Back to portal
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm shadow-black/40"
        >
          {/* Contact */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-100">Contact</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  First name<span className="text-red-500"> *</span>
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                  value={piFirstName}
                  onChange={(e) => setPiFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Last name<span className="text-red-500"> *</span>
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                  value={piLastName}
                  onChange={(e) => setPiLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Email<span className="text-red-500"> *</span>
                </label>
                <input
                  type="email"
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none bg-zinc-950/60 ${
                    emailError ? 'border-red-500 focus:border-red-400' : 'border-zinc-800 focus:border-emerald-500/70'
                  }`}
                  value={piEmail}
                  onChange={(e) => {
                    setPiEmail(e.target.value);
                    setEmailError(null);
                  }}
                  required
                />
                {emailError && (
                  <p className="text-xs text-red-400">{emailError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Phone (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                  value={piPhone}
                  onChange={(e) => setPiPhone(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Affiliation */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-100">Affiliation</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Institution<span className="text-red-500"> *</span>
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Country<span className="text-red-500"> *</span>
                </label>
                <input
                  list="country-options"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Start typing to search..."
                  required
                />
                <datalist id="country-options">
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </div>
          </section>

          {/* Project */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-100">Project</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Project Title <span className="text-[10px] text-zinc-500">(optional)</span>
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Data Use Proposal<span className="text-red-500"> *</span>
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Planned Start<span className="text-red-500"> *</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                    value={plannedStart}
                    onChange={(e) => setPlannedStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Planned End<span className="text-red-500"> *</span>
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-emerald-500/70"
                    value={plannedEnd}
                    onChange={(e) => setPlannedEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              {dateError && (
                <p className="text-xs font-medium text-red-400">{dateError}</p>
              )}
            </div>
          </section>

          {/* Data requested */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-100">Data requested</h2>
            <p className="text-xs text-zinc-400">
              Pick every dataset you want approved. Each card calls out the Level 1, 2, or 3 scope, and those scopes match the API and download experience.
            </p>
            {datasetOptions.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No datasets are available yet. Update <code className="font-mono text-[10px]">lib/gym-datasets.ts</code>{' '}
                when you&apos;re ready to expose new scopes.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {datasetOptions.map((ds) => {
                  const active = !!selectedDatasets[ds.slug];
                  return (
                    <button
                      type="button"
                      key={ds.slug}
                      onClick={() => toggleDataset(ds.slug)}
                      className={`flex h-full flex-col justify-between rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-emerald-500/70 bg-emerald-500/5 shadow-inner shadow-emerald-500/20'
                          : 'border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/40 hover:text-emerald-100'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold text-zinc-50">{ds.label}</h3>
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              active ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : 'bg-zinc-700'
                            }`}
                          />
                        </div>
                        <p className="text-[11px] font-medium text-emerald-300">
                          {DATASET_LEVEL_LABELS[ds.slug as keyof typeof DATASET_LEVEL_LABELS]}
                        </p>
                        <p className="text-xs text-zinc-400">{ds.description}</p>
                      </div>
                      <div className="mt-4 text-[11px] text-zinc-400">
                        {active ? (
                          <span className="font-medium text-emerald-300">Selected</span>
                        ) : (
                          'Tap to include this dataset'
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {datasetError && (
              <p className="text-xs font-medium text-red-400">{datasetError}</p>
            )}
          </section>

          {/* Collaborators */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-100">Collaborators</h2>
              <button
                type="button"
                onClick={addCollaborator}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-emerald-500/70 hover:text-emerald-300"
              >
                + Add collaborator
              </button>
            </div>
            {collaborators.length === 0 && (
              <p className="text-xs text-zinc-500">
                Optional. Add anyone else who needs access under the same project approval.
              </p>
            )}
            <div className="space-y-3">
              {collaborators.map((c, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
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
                      value={c.firstName}
                      onChange={(e) => updateCollaborator(index, 'firstName', e.target.value)}
                      required
                    />
                    <input
                      placeholder="Last name"
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                      value={c.lastName}
                      onChange={(e) => updateCollaborator(index, 'lastName', e.target.value)}
                      required
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                      value={c.email}
                      onChange={(e) => updateCollaborator(index, 'email', e.target.value)}
                      required
                    />
                    <input
                      placeholder="Phone (optional)"
                      type="tel"
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                      value={c.phone}
                      onChange={(e) => updateCollaborator(index, 'phone', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            {collaboratorError && (
              <p className="text-xs font-medium text-red-400">{collaboratorError}</p>
            )}
          </section>

          {/* Submission state */}
          {error && (
            <p className="text-xs font-medium text-red-400">
              {error}
            </p>
          )}
          {successId && (
            <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              Request submitted! Internal ID:{' '}
              <span className="font-mono text-emerald-200">{successId}</span>. The admin
              view can now triage and approve/deny this request.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-zinc-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
            >
              {submitting ? 'Submitting...' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
