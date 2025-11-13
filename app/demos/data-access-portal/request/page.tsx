'use client';

import { useState } from 'react';

type DatasetChoice = {
  id: string;
  label: string;
  description: string;
  slug: string;
  levels: number[];
};

const DATASET_CHOICES: DatasetChoice[] = [
  {
    id: 'workout_sessions',
    label: 'Workout Sessions',
    description: 'Session-level info: date, focus, duration, basic aggregates.',
    slug: 'workout_sessions',
    levels: [1, 2, 3],
  },
  {
    id: 'set_metrics',
    label: 'Set-Level Metrics',
    description: 'Per-set weight, reps, RIR / RPE, and volume.',
    slug: 'set_metrics',
    levels: [1, 2, 3, 4],
  },
  {
    id: 'body_metrics',
    label: 'Body Metrics',
    description: 'Body weight and related longitudinal metrics.',
    slug: 'body_metrics',
    levels: [2, 3],
  },
  {
    id: 'aggregates',
    label: 'Aggregated Summaries',
    description: 'Muscle-group / exercise aggregates (weekly / monthly volume).',
    slug: 'aggregates',
    levels: [3, 4],
  },
];

const DURATION_OPTIONS = [
  { value: '<6m', label: '< 6 months' },
  { value: '6-12m', label: '6–12 months' },
  { value: '>12m', label: '> 12 months' },
];

type CollaboratorInput = { name: string; email: string; institution: string };

export default function DataAccessRequestPage() {
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [piName, setPiName] = useState('');
  const [piEmail, setPiEmail] = useState('');
  const [piPhone, setPiPhone] = useState('');
  const [institution, setInstitution] = useState('');
  const [country, setCountry] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [duration, setDuration] = useState('');
  const [datasetLevels, setDatasetLevels] = useState<Record<string, number | null>>({});
  const [collaborators, setCollaborators] = useState<CollaboratorInput[]>([]);

  const toggleDatasetLevel = (slug: string, level: number) => {
    setDatasetLevels((prev) => {
      const current = prev[slug] ?? null;
      return {
        ...prev,
        [slug]: current === level ? null : level,
      };
    });
  };

  const addCollaborator = () => {
    setCollaborators((prev) => [
      ...prev,
      { name: '', email: '', institution: '' },
    ]);
  };

  const updateCollaborator = (index: number, field: keyof CollaboratorInput, value: string) => {
    setCollaborators((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  };

  const removeCollaborator = (index: number) => {
    setCollaborators((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessId(null);

    try {
      const datasets = Object.entries(datasetLevels)
        .filter(([, level]) => level != null)
        .map(([slug, level]) => ({
          datasetSlug: slug,
          level: level as number,
        }));

      const cleanCollaborators = collaborators
        .filter((c) => c.name && c.email)
        .map((c) => ({
          name: c.name,
          email: c.email,
          institution: c.institution || undefined,
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
          projectTitle,
          dataUseProposal: proposal,
          plannedStart: plannedStart || null,
          plannedEnd: plannedEnd || null,
          expectedDurationCategory: duration || null,
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
      setError(err.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Demo • Data Access Request
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">
            Request Access to the Gym Dataset
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            This form mirrors a real Data Access Request (DAR) pipeline. Provide context
            about who you are, your project, and which slices of the gym dataset you&apos;d like to use.
          </p>
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
                  Name<span className="text-red-500"> *</span>
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
                  value={piName}
                  onChange={(e) => setPiName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Email<span className="text-red-500"> *</span>
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
                  value={piEmail}
                  onChange={(e) => setPiEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Phone (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
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
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
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
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* Project */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-100">Project</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Project Title<span className="text-red-500"> *</span>
                </label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Data Use Proposal<span className="text-red-500"> *</span>
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Planned Start
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
                    value={plannedStart}
                    onChange={(e) => setPlannedStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Planned End
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
                    value={plannedEnd}
                    onChange={(e) => setPlannedEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Expected Duration (bucket)
                  </label>
                  <select
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500/70"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option value="">Select</option>
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Data requested */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-100">Data requested</h2>
            <p className="text-xs text-zinc-400">
              Choose which parts of the gym dataset you&apos;d like to access. Each card maps
              roughly to a &quot;data type&quot; you&apos;d see in a real cohort catalogue.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {DATASET_CHOICES.map((ds) => {
                const selectedLevel = datasetLevels[ds.slug] ?? null;
                return (
                  <div
                    key={ds.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-medium text-zinc-50">{ds.label}</h3>
                        {selectedLevel && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            Level {selectedLevel}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400">{ds.description}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ds.levels.map((lvl) => {
                        const active = selectedLevel === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => toggleDatasetLevel(ds.slug, lvl)}
                            className={`rounded-full border px-2 py-1 text-[11px] font-medium transition ${
                              active
                                ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300'
                                : 'border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-200'
                            }`}
                          >
                            Level {lvl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
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
                Optional. Add any collaborators who will work with this dataset under the
                same project.
              </p>
            )}

            <div className="space-y-3">
              {collaborators.map((c, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
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
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <input
                      placeholder="Name"
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                      value={c.name}
                      onChange={(e) =>
                        updateCollaborator(index, 'name', e.target.value)
                      }
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                      value={c.email}
                      onChange={(e) =>
                        updateCollaborator(index, 'email', e.target.value)
                      }
                    />
                    <input
                      placeholder="Institution (optional)"
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs outline-none focus:border-emerald-500/70"
                      value={c.institution}
                      onChange={(e) =>
                        updateCollaborator(index, 'institution', e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
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
