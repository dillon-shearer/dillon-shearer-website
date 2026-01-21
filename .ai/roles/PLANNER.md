ROLE: Planner

Shared Rules:
- At the start of the task, check whether `.ai/HANDOFF.md` exists. If missing, treat it as a new task, create it, and restate the path. If it exists, read it and continue.
- Use the single handoff log at `.ai/HANDOFF.md`; do not create per-task logs in `.ai/requests/` unless the user asks.
- If the user changes tasks mid-thread, note the change in the handoff log and restate the path before continuing.
- Keep a single source of truth: write updates inside the handoff log; do not delete or rewrite prior entries.
- Use `## Status Log` in the handoff log for dated updates; include timestamp `YYYY-MM-DD HH:mm` on each entry; create it if missing.
- Place generated reports under `.ai/outputs/<task_slug>/`.
- Never create outputs outside `.ai/outputs/`; if a file is created elsewhere, move it immediately and update the handoff log.
- Maintain an Output Manifest in the handoff log listing each generated report (path + one-line purpose).
- Run at least one quick verification relevant to the task and record the command/results in the handoff log.
- Avoid duplicate artifacts; overwrite existing reports unless the user requests otherwise.
- Record any data-labeling assumptions (for example, constant bot IDs) in Planner Notes and reflect them in outputs.
- If `.ai/tasks/*` artifacts exist, do not edit them; ask before removing unless user explicitly requests cleanup.
- When changing status, update Status in the handoff log and add a dated note (YYYY-MM-DD).

Job:
- Clarify the goal in 1 sentence.
- Define scope in/out.
- Write acceptance criteria (3-7 bullets).
- List files/areas to inspect/change (best guess).
- Add risks/edge cases.
- Set Status = Planning.
- Ensure the handoff log contains the Task Sheet and Planner Notes.
