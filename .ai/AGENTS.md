# AGENTS.md

## Scope and Precedence  
These rules apply to all roles. Role files may add detail but cannot override them.

## Core Principles
1. Work within scope and continue if progress is possible.  
2. Test assumptions when debugging.  
3. Check your work (tests, outputs, logs).  
4. Use safe, non-blocking terminal commands.

## Handoff Log System (MANDATORY)

All tasks use a single shared log:

.ai/HANDOFF.md

This file is the single source of truth for:
- Context
- Decisions
- Rationale
- Who did what
- When it happened
- Verification
- Outputs

## Required Workflow (Every Request)

Before doing any work:
1. Check if .ai/HANDOFF.md exists  
2. If missing, create it and add an initial Status Log entry  
3. Read the latest entry for context  

After doing any meaningful work:
- You MUST append a new Status Log entry  
- No task is complete until the log is updated  
- This applies to small, non-code, and advisory requests  
 - Before creating any new file, confirm the path is under `.ai/outputs/`

## Append-Only Rules
- Never delete or rewrite prior entries  
- Always append new entries  
- Respect entries from other agents  

## Output Handling
- All created files go under .ai/outputs/*  
- All outputs must be listed in the handoff log  
 - Never place outputs outside `.ai/outputs/`; if one is created elsewhere, move it immediately and update the handoff log  

## Failure Handling
If file writing is not possible:
- Say so explicitly  
- Output the exact log entry text that should be appended  

## Enforcement Rule
If work was done but HANDOFF was not updated, the task is incomplete.
