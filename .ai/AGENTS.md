# AGENTS.md

## Scope and Precedence
These are top-level principles that apply to all roles. Role files add workflow details and do not override these principles.

## Core Principles
1. Work doggedly within the stated scope. If you know the user's goal and can make progress without new input, keep going. If blocked or waiting on user input, stop and explain why.
2. Work smart. When debugging, step back and test assumptions. Add lightweight logging or checks to confirm hypotheses.
3. Check your work. If you write code, run a relevant check. If you start a long process, verify it is running as expected.
4. Be cautious with terminal commands. Prefer commands that exit on their own. For long-running processes, use a safe background method and verify logs. Avoid running services unless explicitly needed.

## Handoff Log (Single File)

1. Use a single shared log at `.ai/HANDOFF.md` for all tasks until the user resets it.

2. Do not create per-task request logs in `.ai/requests/` unless the user explicitly asks.

3. At the start of each task, check whether `.ai/HANDOFF.md` exists. If missing, treat it as a new task, create the handoff log, and restate the path. If it exists, read it and continue the ongoing task.

4. The handoff log is the single source of truth for status, decisions, outputs, and verification.

5. Append-only: do not delete or rewrite prior entries from other agents.

6. Every update must include a `## Status Log` entry with timestamp `YYYY-MM-DD HH:mm`.

7. If the agent produces outputs, store them under `.ai/outputs/*` and list them in the handoff log's Output Manifest.
