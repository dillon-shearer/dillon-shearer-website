'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PortalPageShell } from '../_components/page-shell';
import {
  AVAILABLE_GYM_DATASETS,
  DATASET_LEVEL_LABELS,
  PRIMARY_DATASET_LEVEL,
} from '@/lib/gym-datasets';
import type { DarVisualizationPreset } from '@/types/data-access-portal';
import { COUNTRY_OPTIONS } from '@/lib/constants/countries';

const WIZARD_STEPS = [
  {
    id: 'contact',
    label: 'Contact & affiliation',
    description: 'Who is requesting access and where they work.',
  },
  {
    id: 'project',
    label: 'Project justification',
    description: 'Describe the data use case and expected timeline.',
  },
  {
    id: 'data',
    label: 'Datasets & collaborators',
    description: 'Pick scopes and list anyone who should share this approval.',
  },
] as const;

type CollaboratorInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const DUPLICATE_EMAIL_MESSAGE =
  'We already have an active request tied to this email. Please wait for the admin response before resubmitting.';

const VISUAL_PRESETS: { id: DarVisualizationPreset; label: string; description: string }[] = [
  {
    id: 'split-all-time',
    label: 'All-time split mix (push/pull/legs)',
    description: 'Share of lifetime sessions + tonnage by split.',
  },
  {
    id: 'volume-all-time',
    label: 'All-time weekly volume',
    description: 'Every week stacked together to show the long arc.',
  },
  {
    id: 'rep-all-time',
    label: 'All-time rep bands',
    description: 'How often you live in strength, hypertrophy, or pump zones.',
  },
  {
    id: 'training-days-all-time',
    label: 'Lifetime training days per weekday',
    description: 'Which days you actually train across the full dataset.',
  },
];

export default function DataAccessRequestPage() {
  const datasetOptions = AVAILABLE_GYM_DATASETS;
  const lastStepIndex = WIZARD_STEPS.length - 1;

  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [collaboratorError, setCollaboratorError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState<string | null>(null);
  const [emailDuplicate, setEmailDuplicate] = useState(false);
  const [emailDuplicateMessage, setEmailDuplicateMessage] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const emailCheckAbortRef = useRef<AbortController | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

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
  const [visualSelectionError, setVisualSelectionError] = useState<string | null>(null);
  const [selectedVizPresets, setSelectedVizPresets] = useState<
    Record<DarVisualizationPreset, boolean>
  >({});
  const [vizCustomRequest, setVizCustomRequest] = useState('');
  const [selectedDatasets, setSelectedDatasets] = useState<Record<string, boolean>>({});
  const [collaborators, setCollaborators] = useState<CollaboratorInput[]>([]);

  useEffect(() => {
    emailCheckAbortRef.current?.abort();
    setEmailChecking(false);
    setEmailDuplicate(false);
    setEmailDuplicateMessage(null);
    setVerifiedEmail(null);
  }, [piEmail]);

  const submitDisabled = submitting;

  const getSelectedDatasets = () =>
    Object.entries(selectedDatasets)
      .filter(([, selected]) => selected)
      .map(([slug]) => ({
        datasetSlug: slug,
        level:
          PRIMARY_DATASET_LEVEL[slug as keyof typeof PRIMARY_DATASET_LEVEL] ?? 1,
      }));

  const getSelectedVizPresets = () =>
    Object.entries(selectedVizPresets)
      .filter(([, active]) => active)
      .map(([id]) => id as DarVisualizationPreset);

  const hasIncompleteCollaborator = () =>
    collaborators.some(
      (c) => !c.firstName.trim() || !c.lastName.trim() || !c.email.trim()
    );

  const validateDates = () => {
    if (!plannedStart || !plannedEnd) {
      setDateError('Planned start and end dates are required.');
      return false;
    }

    const startDate = new Date(plannedStart);
    const endDate = new Date(plannedEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date('2999-12-31');

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setDateError('Provide valid planned project dates.');
      return false;
    }

    if (endDate < today) {
      setDateError('Planned end date cannot be in the past.');
      return false;
    }

    if (endDate > maxDate) {
      setDateError('Planned end date is too far in the future.');
      return false;
    }

    if (startDate > endDate) {
      setDateError('End date must be after the start date.');
      return false;
    }

    setDateError(null);
    return true;
  };

  const ensureEmailAvailable = async () => {
    const emailValue = piEmail.trim();
    if (!emailValue || !isValidEmail(emailValue)) {
      return false;
    }

    if (verifiedEmail === emailValue) {
      if (emailDuplicate) {
        setEmailError(DUPLICATE_EMAIL_MESSAGE);
        return false;
      }
      setEmailError(null);
      return true;
    }

    emailCheckAbortRef.current?.abort();
    const controller = new AbortController();
    emailCheckAbortRef.current = controller;
    setEmailChecking(true);

    try {
      const res = await fetch('/api/data-access-portal/requests/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error('Failed to verify email');
      }
      const json = await res.json();
      if (controller.signal.aborted) {
        return false;
      }
      const exists = Boolean(json.exists);
      setEmailDuplicate(exists);
      setEmailDuplicateMessage(exists ? DUPLICATE_EMAIL_MESSAGE : null);
      setVerifiedEmail(emailValue);
      if (exists) {
        setEmailError(DUPLICATE_EMAIL_MESSAGE);
        return false;
      }
      setEmailError(null);
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return false;
      }
      console.error('Email availability check failed', err);
      setEmailError('Could not verify email. Please try again.');
      return false;
    } finally {
      if (!controller.signal.aborted) {
        setEmailChecking(false);
      }
    }
  };

  const validateContactSection = () => {
    const firstName = piFirstName.trim();
    const lastName = piLastName.trim();
    const email = piEmail.trim();
    const org = institution.trim();
    const rawCountry = country.trim();
    setCountryError(null);

    if (!firstName || !lastName) {
      setError('First and last name are required.');
      return false;
    }
    if (!email) {
      setEmailError('Email is required.');
      setError('Email is required.');
      return false;
    }
    if (!isValidEmail(email)) {
      setEmailError('Use a valid email like name@domain.com.');
      setError('Provide a valid email address.');
      return false;
    }
    setEmailError(null);

    if (!org) {
      setError('Institution is required.');
      return false;
    }

    const matchedCountry = resolveCountryInput(rawCountry);
    if (!matchedCountry) {
      setCountryError('Pick a valid country from the list.');
      setError('Country must be selected from the provided list.');
      return false;
    }
    if (matchedCountry !== country) {
      setCountry(matchedCountry);
    }
    setCountryError(null);
    setError(null);
    return true;
  };

  const validateProjectSection = () => {
    if (!proposal.trim()) {
      setError('Describe your data use proposal.');
      return false;
    }
    setError(null);
    return validateDates();
  };

  const validateDataSection = () => {
    const datasets = getSelectedDatasets();
    const selectedViz = getSelectedVizPresets();
    const customText = vizCustomRequest.trim();
    const hasVizSelection = selectedViz.length > 0 || customText.length > 0;

    if (datasets.length === 0 && !hasVizSelection) {
      setDatasetError('Select at least one dataset or add a visualization package.');
      setVisualSelectionError('Pick a preset or describe a custom visualization.');
      return false;
    }
    setDatasetError(null);
    if (!hasVizSelection) {
      setVisualSelectionError(
        'Pick at least one visualization preset or describe a custom ask.'
      );
      return false;
    }
    setVisualSelectionError(null);

    if (hasIncompleteCollaborator()) {
      setCollaboratorError(
        'Fill first name, last name, and email for every collaborator or remove the row.'
      );
      return false;
    }
    const invalidCollaboratorIndex = collaborators.findIndex(
      (c) => c.email.trim() && !isValidEmail(c.email.trim())
    );
    if (invalidCollaboratorIndex >= 0) {
      setCollaboratorError(
        `Collaborator ${invalidCollaboratorIndex + 1} email must look like name@domain.com.`
      );
      return false;
    }
    setCollaboratorError(null);
    return true;
  };

  const ensureStepValid = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return validateContactSection();
      case 1:
        return validateProjectSection();
      case 2:
        return validateDataSection();
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (activeStep === 0) {
      if (!validateContactSection() || emailChecking) {
        return;
      }
      void (async () => {
        const available = await ensureEmailAvailable();
        if (available) {
          setActiveStep((prev) => Math.min(prev + 1, lastStepIndex));
        }
      })();
      return;
    }
    if (ensureStepValid(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, lastStepIndex));
    }
  };

  const handlePreviousStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const toggleDataset = (slug: string) => {
    setSelectedDatasets((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
    setDatasetError(null);
  };

  const toggleVizPreset = (preset: DarVisualizationPreset) => {
    setSelectedVizPresets((prev) => ({
      ...prev,
      [preset]: !prev[preset],
    }));
    setVisualSelectionError(null);
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
    setSuccessId(null);
    setEmailError(null);

    if (!validateContactSection()) {
      setActiveStep(0);
      return;
    }
    const emailAvailable = await ensureEmailAvailable();
    if (!emailAvailable) {
      setActiveStep(0);
      return;
    }
    if (!validateProjectSection()) {
      setActiveStep(1);
      return;
    }
    if (!validateDataSection()) {
      setActiveStep(2);
      return;
    }

    const trimmedEmail = piEmail.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    if (lastSubmittedEmail && normalizedEmail === lastSubmittedEmail) {
      setEmailError(DUPLICATE_EMAIL_MESSAGE);
      return;
    }

    setSubmitting(true);
    setError(null);
    setDatasetError(null);
    setCollaboratorError(null);
    setDateError(null);
    setVisualSelectionError(null);

    try {
      const datasets = getSelectedDatasets();
      const piName = [piFirstName.trim(), piLastName.trim()]
        .filter(Boolean)
        .join(' ')
        .trim();

      const cleanCollaborators = collaborators.map((c) => ({
        name: `${c.firstName.trim()} ${c.lastName.trim()}`.trim(),
        email: c.email.trim(),
        phone: c.phone.trim() || undefined,
      }));

      const visualizationPresets = getSelectedVizPresets();
      const visualizationCustomRequest = vizCustomRequest.trim() || null;

      const piEmailPayload = trimmedEmail;

      const res = await fetch('/api/data-access-portal/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          piName,
          piEmail: piEmailPayload,
          piPhone: piPhone || undefined,
          institution,
          country,
          projectTitle: projectTitle || null,
          dataUseProposal: proposal,
          plannedStart: plannedStart || null,
          plannedEnd: plannedEnd || null,
          datasets,
          collaborators: cleanCollaborators,
          visualizationPresets,
          visualizationCustomRequest,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'Failed to submit request');
      }

      const json = await res.json();
      setSuccessId(json.data.id);
      setLastSubmittedEmail(normalizedEmail);
      setVerifiedEmail(trimmedEmail);
      setEmailDuplicate(false);
      setEmailDuplicateMessage(null);
      setEmailError(null);
    } catch (err: any) {
      const message = err.message ?? 'Something went wrong';
      if (message.toLowerCase().includes('already requested')) {
        setEmailError(DUPLICATE_EMAIL_MESSAGE);
        setEmailDuplicate(true);
        setEmailDuplicateMessage(DUPLICATE_EMAIL_MESSAGE);
        setVerifiedEmail(trimmedEmail);
        setLastSubmittedEmail(normalizedEmail);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const emailFieldError = emailError ?? emailDuplicateMessage;

  return (
    <PortalPageShell
      eyebrow="Demo - Data Access Request"
      title="Request Access to the Gym Dataset"
      description="Mirror the same workflow I use with enterprise teams: capture who you are, why you need the data, and exactly which gym datasets should be unlocked."
      actions={
        <Link
          href="/demos/data-access-portal"
          className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
        >
          Back to portal
        </Link>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-sm shadow-black/40 sm:p-8 lg:p-10"
      >
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = index === activeStep;
                const isComplete = index < activeStep;
                return (
                  <button
                    type="button"
                    key={step.id}
                    disabled={index > activeStep}
                    onClick={() => {
                      if (index <= activeStep) setActiveStep(index);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? 'border-emerald-500/70 bg-emerald-500/5'
                        : isComplete
                          ? 'border-emerald-400/40 bg-zinc-950/50'
                          : 'border-zinc-900 bg-zinc-950/20'
                    } ${index > activeStep ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                          isComplete
                            ? 'border-emerald-300 text-emerald-200'
                            : isActive
                              ? 'border-emerald-400 text-emerald-100'
                              : 'border-zinc-700 text-zinc-500'
                        }`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
                          {step.label}
                        </p>
                        <p className="text-xs text-zinc-400">{step.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeStep === 0 && (
              <>
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
                          emailFieldError
                            ? 'border-red-500 focus:border-red-400'
                            : 'border-zinc-800 focus:border-emerald-500/70'
                        }`}
                        value={piEmail}
                        onChange={(e) => {
                          setPiEmail(e.target.value);
                          setEmailError(null);
                        }}
                      />
                      {emailChecking && isValidEmail(piEmail.trim()) && !emailFieldError && (
                        <p className="text-[11px] text-zinc-400">Checking email availability…</p>
                      )}
                      {emailFieldError && (
                        <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
                          {emailFieldError}
                        </div>
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
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">
                        Country<span className="text-red-500"> *</span>
                      </label>
                      <input
                        list="country-options"
                        className={`w-full rounded-lg border bg-zinc-950/60 px-3 py-2 text-sm outline-none ${
                          countryError
                            ? 'border-red-500 focus:border-red-400'
                            : 'border-zinc-800 focus:border-emerald-500/70'
                        }`}
                        value={country}
                        onChange={(e) => {
                          setCountry(e.target.value);
                          setCountryError(null);
                        }}
                        placeholder="Start typing to search..."
                      />
                      <datalist id="country-options">
                        {COUNTRY_OPTIONS.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                      {countryError && (
                        <p className="text-xs text-red-400">{countryError}</p>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeStep === 1 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-zinc-100">Project</h2>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      Project Title{' '}
                      <span className="text-[10px] text-zinc-500">(optional)</span>
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
                      />
                    </div>
                  </div>
                  {dateError && (
                    <p className="text-xs font-medium text-red-400">{dateError}</p>
                  )}
                </div>
              </section>
            )}

            {activeStep === 2 && (
              <>
                <section className="space-y-3">
                  <h2 className="text-sm font-medium text-zinc-100">Data requested</h2>
                  <p className="text-xs text-zinc-400">
                    Pick every dataset you want approved. Each card calls out the Level 1, 2, or 3
                    scope, and those scopes match the API and download experience. You can also skip
                    datasets if you only want visualization packages.
                  </p>
                  {datasetOptions.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No datasets are available yet. Update{' '}
                      <code className="font-mono text-[10px]">lib/gym-datasets.ts</code> when
                      you&apos;re ready to expose new scopes.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {datasetOptions.map((ds) => {
                        const active = !!selectedDatasets[ds.slug];
                        return (
                          <button
                            type="button"
                            key={ds.slug}
                            onClick={() => toggleDataset(ds.slug)}
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              active
                                ? 'border-emerald-500/70 bg-emerald-500/5 shadow-inner shadow-emerald-500/20'
                                : 'border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/40 hover:text-emerald-100'
                            }`}
                          >
                            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
                              <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-zinc-50">{ds.label}</h3>
                                <p className="text-[11px] font-medium text-emerald-300">
                                  {DATASET_LEVEL_LABELS[ds.slug as keyof typeof DATASET_LEVEL_LABELS]}
                                </p>
                                <p className="text-xs text-zinc-400">{ds.description}</p>
                              </div>
                              <span
                                className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full md:mt-0 ${
                                  active ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : 'bg-zinc-700'
                                }`}
                              />
                            </div>
                            <div className="mt-2 text-[10px] text-zinc-500">
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

                <section className="space-y-3">
                  <div className="rounded-3xl border border-dashed border-zinc-800/80 bg-zinc-950/40 p-4">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-zinc-100">Visualization package</p>
                      <p className="text-xs text-zinc-400">
                        Aggregates only (no underlying rows). Small-N groups suppressed under 3.
                      </p>
                    </div>

                    <div className="mt-4 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        {VISUAL_PRESETS.map((preset) => {
                          const active = !!selectedVizPresets[preset.id];
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => toggleVizPreset(preset.id)}
                              className={`relative flex h-full flex-col justify-between rounded-2xl border p-3 text-left transition ${
                                active
                                  ? 'border-emerald-500/70 bg-emerald-500/5'
                                  : 'border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/40 hover:text-emerald-100'
                              }`}
                            >
                              <span
                                className={`absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${
                                  active ? 'bg-emerald-400' : 'bg-zinc-700'
                                }`}
                              />
                              <div className="space-y-1.5 pr-5">
                                <p className="text-sm font-semibold text-zinc-50">{preset.label}</p>
                                <p className="text-[11px] text-zinc-400">{preset.description}</p>
                              </div>
                              <p className="text-[11px] text-zinc-400">
                                {active ? (
                                  <span className="font-medium text-emerald-300">Selected</span>
                                ) : (
                                  'Tap to add this visual'
                                )}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-zinc-300">
                            Other / custom ask
                          </label>
                          <textarea
                            className="min-h-[80px] w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                            placeholder="E.g., stacked bar comparing varsity vs JV for velocity compliance."
                            value={vizCustomRequest}
                            onChange={(e) => setVizCustomRequest(e.target.value)}
                          />
                        </div>
                      </div>

                      {visualSelectionError && (
                        <p className="text-xs font-medium text-red-400">{visualSelectionError}</p>
                      )}
                    </div>
                  </div>
                </section>

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
                          />
                          <input
                            placeholder="Last name"
                            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                            value={c.lastName}
                            onChange={(e) => updateCollaborator(index, 'lastName', e.target.value)}
                          />
                          <input
                            placeholder="Email"
                            type="email"
                            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                            value={c.email}
                            onChange={(e) => updateCollaborator(index, 'email', e.target.value)}
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

                  {successId && (
                    <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                      Request submitted! Internal ID:{' '}
                      <span className="font-mono text-emerald-200">{successId}</span>. The admin view
                      can now triage and approve/deny this request.
                    </div>
                  )}
                </section>
              </>
            )}

            {error && (
              <p className="text-xs font-medium text-red-400">{error}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 pt-4">
            <button
              type="button"
              onClick={handlePreviousStep}
              disabled={activeStep === 0}
              className="inline-flex items-center rounded-full border border-zinc-800 px-4 py-2 text-[11px] font-medium text-zinc-200 transition hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
            <div className="flex gap-3">
              {activeStep < lastStepIndex && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-[11px] font-medium text-zinc-100 transition hover:border-emerald-500/70 hover:text-emerald-200"
                >
                  Next: {WIZARD_STEPS[activeStep + 1].label}
                </button>
              )}
              {activeStep === lastStepIndex && (
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-zinc-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
                >
                  {submitting ? 'Submitting...' : 'Submit request'}
                </button>
              )}
            </div>
          </div>
        </form>
    </PortalPageShell>
  );
}
