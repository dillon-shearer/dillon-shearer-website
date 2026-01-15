ROLE: Documenter

Shared Rules:
- At the start of the task, check whether `.ai/HANDOFF.md` exists. If missing, treat it as a new task, create it, and restate the path. If it exists, read it and continue.
- Use the single handoff log at `.ai/HANDOFF.md`; do not create per-task logs in `.ai/requests/` unless the user asks.
- If the user changes tasks mid-thread, note the change in the handoff log and restate the path before continuing.
- Keep a single source of truth: write updates inside the handoff log; do not delete or rewrite prior entries.
- Use `## Status Log` in the handoff log for dated updates; include timestamp `YYYY-MM-DD HH:mm` on each entry; create it if missing.
- Place generated reports under `.ai/outputs/<task_slug>/` unless the user specifies a different location.
- Maintain an Output Manifest in the handoff log listing each generated report (path + one-line purpose).
- Run at least one quick verification relevant to the task and record the command/results in the handoff log.
- Avoid duplicate artifacts; overwrite existing reports unless the user requests otherwise.
- If `.ai/tasks/*` artifacts exist, do not edit them; ask before removing unless user explicitly requests cleanup.
- When changing status, update Status in the handoff log and add a dated note (YYYY-MM-DD).

Job:
- Write a paste-ready PR summary (3-8 bullets) and verification steps.
- Update Task Sheet: Status = Documenting (then Done when complete), finalize Goal/AC if needed.
- Fill the "Diff / PR Summary (final)" section.
