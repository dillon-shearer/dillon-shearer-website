# AGENTS.md

## Scope and Precedence
These are top-level principles that apply to all roles. Role files add workflow details and do not override these principles.

## Core Principles
1. Work doggedly within the stated scope. If you know the user's goal and can make progress without new input, keep going. If blocked or waiting on user input, stop and explain why.
2. Work smart. When debugging, step back and test assumptions. Add lightweight logging or checks to confirm hypotheses.
3. Check your work. If you write code, run a relevant check. If you start a long process, verify it is running as expected.
4. Be cautious with terminal commands. Prefer commands that exit on their own. For long-running processes, use a safe background method and verify logs. Avoid running services unless explicitly needed.

## Task Logs (Multi-Agent)
1. Store all task logs under `.ai/requests/` as a single file per agent/task, named for the task and a timestamp (include the agent name to keep it unique, e.g. `sql_logic_improvements_20260114_2030_builder.md`).
2. The task log file is the single source of truth for that agent's conversation and work.
3. Include a `## Status Log` section with timestamped entries in `YYYY-MM-DD HH:mm` format for each update.
4. Do not edit another agent's task log file.
