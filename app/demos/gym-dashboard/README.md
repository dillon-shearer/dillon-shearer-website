# Gym Dashboard Demo

## AI Agent Change Log
> This section is maintained by automated or semi-automated AI agents.
> Each entry documents why a change was made, which parts of the system were
> touched, and what context prompted it.
>
> Future agents: whenever you make non-trivial behavioral or prompt-related
> changes to the Gym Dashboard demo or the shared gym-chat pipeline that
> affect this demo, append a new entry here **AT THE END OF THE FILE** with:
> - UTC timestamp
> - Model name
> - Files touched
> - Brief reason and user scenario that motivated the change.

[2026-01-02T16:28:56Z] Gym Chat multi-turn state & failure fallback hardening
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `app/demos/gym-dashboard/chat/ChatClient.tsx`
  - `lib/gym-chat/conversation.ts`
  - `lib/gym-chat/response-utils.ts`
  - `types/gym-chat.ts`
  - `eval/run-gym-chat-clarification-eval.ts`
  - `eval/run-gym-chat-multiturn-eval.ts`
  - `package.json`
- **Reason**:
  - Long chats and follow-ups were losing context or falling into clarification loops.
  - Clarification answers and short replies needed to be scoped to the active clarification only.
  - Explanation failures were breaking the conversation instead of degrading gracefully.
- **Key Changes**:
  - Introduced explicit conversation state (lastAnalysis, pendingClarification, lastError) and turn-mode classification for new questions vs clarifications vs follow-ups.
  - Scoped return-for-effort clarifications to pending state and tied follow-ups to analysis kinds.
  - Added fallback explanation summaries with explanationError metadata instead of returning 503s.
  - Persisted conversation state in the client and added multi-turn eval scripts.
- **Related Conversation / Prompt**:
  - "Which exercises are giving me the most return for effort?" -> "b. progression over time"
  - "Which lifts have stalled, and for how long?"
  - "Drill into the Incline Press performance trends over the last year?"
  - "Compare top-end efforts over the last 12 months vs the last 3 months?"
  - "?" after a clarification prompt should not loop.

[2026-01-03T00:13:29Z] Gym Chat top-end comparison canonical plan
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `lib/gym-chat/canonical-plans.ts`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/sql-policy.ts`
  - `types/gym-chat.ts`
  - `eval/run-gym-chat-multiturn-eval.ts`
  - `eval/run-gym-chat-top-end-compare-eval.ts`
  - `package.json`
- **Reason**:
  - The 12m vs 3m top-end comparison only ran 12-month queries, causing the explanation to request missing 3-month data.
- **Key Changes**:
  - Added a dedicated top-end 12m vs 3m canonical plan with queries for both windows.
  - Routed comparison questions to the new analysis kind and injected window-aware explanation notes.
  - Extended window metadata to include 3-month policies and added a focused eval script.
- **Related Conversation / Prompt**:
  - "Compare top-end efforts over the last 12 months vs the last 3 months?"

[2026-01-01T20:51:20Z] Gym Chat clarification state, scroll, and table overflow fixes
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `app/demos/gym-dashboard/chat/ChatClient.tsx`
  - `types/gym-chat.ts`
  - `eval/run-gym-chat-clarification-eval.ts`
  - `package.json`
- **Reason**:
  - Return-for-effort clarifications were looping and reappearing for unrelated questions like stalled lifts.
  - Auto-scroll was dragging the viewport while users tried to review earlier messages.
  - Wide query result tables forced the entire chat column to scroll horizontally.
- **Key Changes**:
  - Added explicit pending-clarification state to scope a/b handling and reset context after unresolved clarifications.
  - Auto-scroll now triggers only when a new assistant message starts and the user is already at the bottom.
  - Wrapped markdown tables and query previews in horizontal scroll containers and hid horizontal overflow on the main chat pane.
  - Added a multi-turn clarification regression eval script.
- **Related Conversation / Prompt**:
  - "Which exercises are giving me the most return for effort?" -> "b. progression over time"
  - "Which lifts have stalled, and for how long?"
  - "I only want it to move the scroll bar when a response is first printed."
  - "Wide result tables cause the whole chat to scroll horizontally."

[2026-01-01T18:34:13Z] Gym Chat reliability & UX hardening
- **Agent / Model**: GPT-5 (Builder Agent)
- **Scope**:
  - `app/demos/gym-dashboard/chat/ChatClient.tsx`
  - `app/api/gym-chat/route.ts`
  - `lib/gym-chat/llm.ts`
  - `lib/gym-chat/sql-errors.ts`
- **Reason**:
  - Gym Dashboard chat auto-scrolled to the very bottom of long answers,
    making it hard to see the original question and the start of replies.
  - Follow-up data questions like "Hack Squat please" could hang indefinitely
    with a loading bubble even though SQL queries had executed successfully.
- **Key Changes**:
  - Added scroll behavior that only auto-scrolls when the user is near the bottom
    of the chat, making long answers easier to follow.
  - Introduced OpenAI request timeouts and explanation-step fallbacks in the
    gym-chat API, so results either succeed or fail clearly instead of hanging.
  - Added a client-side timeout around `/api/gym-chat` calls in `ChatClient`
    to guarantee the UI recovers even if the backend is slow.
  - Simplified SQL error messaging for end users unless debug headers are enabled.
- **Related Conversation / Prompt**:
  - User reported edge cases in the Gym Dashboard chatbot, including a
    "never ending chat bubble" when asking "Hack Squat please" as a follow-up
    after an Incline Press analysis.

[2026-01-01T19:00:34Z] Gym Chat SQL & explanation refinement
- **Agent / Model**: GPT-5 (Builder Agent)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `lib/gym-chat/llm.ts`
  - `lib/gym-chat/sql-errors.ts`
- **Reason**:
  - Real conversations surfaced several issues:
    - Generic model-outage responses after earlier good answers.
    - SQL alias bugs in muscle-group and top-end-effort analyses.
    - Explanations drifting off-topic (e.g., body-part balance when only a session count was requested).
    - Follow-up suggestions phrased as meta-offers instead of user-style questions.
    - Messages promising "inspect raw query results below" when nothing meaningful was visible.
- **Key Changes**:
  - Added more specific LLM failure messaging and kept explanation-only failures distinct.
  - Fixed canonical SQL for muscle-group comparison and added a per-exercise fallback when needed.
  - Added a canonical top-end-efforts plan to avoid alias errors and return session frequency data.
  - Tightened explanation prompts to stay on-topic and handle ambiguous metrics like "return for effort" with a clarification flow.
  - Normalized follow-up suggestions to look like user-typed questions and gated "inspect results" messaging on visible data.
- **Related Conversations / Scenarios**:
  - "How many sessions did I log in the last 8 weeks?" -> "what about all time?"
  - "which muscle groups am I over or under training?"
  - "Which exercises are giving me the most return for effort?"
  - "Am I recovering well between sessions?"
  - "How often am I hitting true top-end efforts?" and its follow-ups.

[2026-01-01T19:29:59Z] Gym Chat canonical SQL and clarification fixes
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `app/demos/gym-dashboard/README.md`
  - `README.md`
- **Reason**:
  - Canonical top-end-effort and muscle-group queries still failed with `gl` alias errors under the SQL policy rewrite.
  - The "return for effort" clarification loop never advanced when users replied with short menu choices.
  - Recovery answers promised "inspect results below" even when queries returned no usable data.
- **Key Changes**:
  - Bypassed the SQL policy layer for canonical plans with a basic safety check and explicit policy metadata.
  - Mapped `a`/`b` menu replies after the return-for-effort clarification into concrete analysis questions before planning.
  - Gated the "inspect raw results" message on actual data/error presence and added a clearer no-data fallback for recovery.
- **Related Conversation / Prompt**:
  - "How often am I hitting true top-end efforts?"
  - "Which muscle groups am I undertraining or overtraining?"
  - "Which exercises are giving me the most return for effort?"
  - "Am I recovering well between sessions?"

[2026-01-01T19:55:27Z] Gym Chat canonical analysis hardening
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `app/demos/gym-dashboard/chat/ChatClient.tsx`
  - `app/demos/gym-dashboard/README.md`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/sql-policy.ts`
  - `types/gym-chat.ts`
- **Reason**:
  - Muscle-group fallback queries errored on `date_trunc(unknown, text)`.
  - 1RM progression, stalled lifts, and lighter-weight progress queries referenced `gym_lifts` without a matching alias.
  - Top-end effort queries still relied on brittle timestamp handling.
- **Key Changes**:
  - Standardized canonical gym-lifts date/timestamp handling to keep date_trunc and joins type-safe.
  - Added canonical 1RM-based plans for progression, stalled lifts, and lighter-weight progress using a shared estimate formula.
  - Extended policy window metadata to cover 12/24-week windows in query details and coverage lines.
- **Related Conversation / Prompt**:
  - "Which muscle groups am I undertraining or overtraining?"
  - "Which exercises are giving me the most return for effort?" -> "b"
  - "Which lifts have stalled, and for how long?"
- "Where am I making progress despite using lighter weights?"
- "How often am I hitting true top-end efforts?"

[2026-01-01T20:28:11Z] Gym Chat lifts CTE consolidation
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `lib/gym-chat/canonical-plans.ts`
  - `lib/gym-chat/llm.ts`
  - `lib/gym-chat/semantics.ts`
  - `lib/gym-chat/sql-policy.ts`
  - `scripts/gym-chat-canonical-sql.ts`
  - `package.json`
- **Reason**:
  - Canonical analyses still surfaced alias/type errors when gym_lifts/gl references drifted or date handling mixed types.
- **Key Changes**:
  - Centralized per-set SQL in a shared `lifts` CTE with typed date/timestamp expressions.
  - Updated canonical analysis plans to use the shared lifts source for 1RM, stalled lifts, lighter-weight progress, top-end efforts, and muscle-group balance.
  - Expanded SQL policy date detection to recognize `session_date`/`performed_at`, plus added regression checks for alias leaks and timestamp COALESCE safety.
- **Related Conversation / Prompt**:
  - "Which muscle groups am I undertraining or overtraining?"
  - "Which exercises are giving me the most return for effort?" -> "b"
  - "Which lifts have stalled, and for how long?"

[2026-01-15T01:04:02Z] Gym Dashboard chatbot branch merge note
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/demos/gym-dashboard/README.md`
- **Reason**:
  - Documented that Gym Dashboard chatbot updates were merged across branches when no edits overlapped.
- **Key Changes**:
  - Added a changelog entry noting the merge context for chatbot updates.
- **Related Conversation / Prompt**:
  - "add a message about merging branches for gym dashboard chatbot to it or something"
  - "Where am I making progress despite using lighter weights?"
  - "How often am I hitting true top-end efforts?"

## Gym Chat Analysis Coverage
- **Session counts**: Counts distinct training days over an explicit window (defaults to last 12 weeks).
- **Set count rankings**: Ranks exercises by total sets over the last 90 days (default top 10, honors explicit top N).
- **Volume rankings / return for effort (option a)**: Ranks exercises by total volume over the last 90 days (default top 10 or user-specified top N).
- **Return for effort (option b)**: Shows weekly estimated 1RM progression per exercise over the last 12 months.
- **Progressive overload**: Finds the longest continuous estimated-1RM improvement streak per exercise (last 12 months).
- **Stalled lifts**: Calculates days since the last estimated 1RM increase per exercise (minimum 3 sessions, last 12 months).
- **Progress with lighter weights**: Flags exercises where average working weight decreased but estimated 1RM increased (recent 6 months vs prior 6 months, within last 12 months).
- **Top-weight sets**: Lists the heaviest sets over the last 90 days (default top 5, honors explicit top N).
- **Set-level breakdown**: Summarizes within-session drop-off via set_number buckets and identifies best vs worst sets (default 90 days; adds a 12-month anchor when an exercise is specified).
- **Worst day of lifting**: Finds the lowest-volume session over the last 30 days (or explicit window).
- **Favorite split day**: Ranks day_tag frequency over the last 12 months (or explicit window).
- **Weekly training volume**: Aggregates total weekly volume over the last 12 months (or explicit window).
- **Muscle-group balance**: Compares average weekly volume by body part (or by exercise as a proxy) over the last 24 weeks, splitting recent vs prior 12-week windows.
- **Top-end efforts**: Counts top-3 heaviest sets per exercise and the sessions containing those sets over the last 12 months.
- **Top-end efforts (12m vs 3m)**: Compares top-end set frequency and session coverage across the last 12 months versus the most recent 3 months.
- **Targeted-muscle planning**: Builds a muscle-specific session (e.g., quads) using recent exercise history when available, otherwise falls back to a generic template.
- **Goal-based planning**: Adjusts sets/reps/rest for strength, hypertrophy, or endurance focus.
- **Deload checks**: Flags large weekly volume swings and suggests a deload when needed.
- **Exercise technique guidance**: Provides general form cues, common mistakes, and variations from a local exercise library.

## First-class Gym Chat Questions
- **Sessions**: "How many sessions did I log in the last 8 weeks?" (window: explicit or 12 weeks; metric: distinct session days).
- **Total sets (ranked)**: "Which exercises had the most total sets in the last 90 days?" (window: explicit or 90 days; metric: total sets; limitation: uses exercise names as logged).
- **Total volume (ranked)**: "Which exercises had the most total volume in the last 90 days?" (window: explicit or 90 days; metric: total volume / tonnage).
- **Return for effort (volume)**: "Show total volume per exercise over the last 90 days." (window: explicit or 90 days; metric: total volume).
- **Return for effort (progression)**: "Show my progression over time for each exercise." (window: 12 months; metric: estimated 1RM).
- **Stalled lifts**: "Which lifts have stalled, and for how long?" (window: 12 months; metric: days since last estimated-1RM increase).
- **Progress with lighter weights**: "Where am I making progress despite using lighter weights?" (window: recent 6 months vs prior 6 months).
- **Top-end efforts**: "How often am I hitting true top-end efforts?" (window: 12 months; metric: top-3 set counts).
- **Set-level breakdown**: "Break down my last session sets for squats?" (window: 90 days; metric: set_number drop-off + best/worst sets).
- **Top weight sets**: "Show my top 5 highest-weight sets from the last 90 days." (window: explicit or 90 days; metric: weight x reps).
- **Worst day**: "What was my worst day of lifting in the past 30 days?" (window: explicit or 30 days; metric: session volume).
- **Favorite split**: "What is my favorite split day?" (window: explicit or 12 months; metric: day_tag frequency).
- **Weekly volume**: "What was my weekly training volume over the last 12 months?" (window: explicit or 12 months).
- **Muscle balance**: "Which muscle groups am I undertraining or overtraining?" (window: 24 weeks split into recent vs prior 12 weeks).
- **Targeted planning**: "Help me plan my sets for quads using my previous lifts." (window: 12 months; weights anchored to recent working sets).
- **Goal-based planning**: "Plan a quads session with a hypertrophy focus." (goal: hypertrophy; reps/sets adjusted).
- **Deload check**: "Do I need a deload based on my recent training volume?" (window: 12 weeks; compares weekly volume swings).
- **Technique guidance**: "What cues for deadlift?" (general form cues; not log-backed).

## Notes & Limitations
- These analyses require enough logged sessions to produce stable trends; sparse data can yield empty results.
- Estimated 1RM is derived from the Epley formula (`weight * (1 + reps / 30)`), not direct max testing.
- Workout planning weights are anchored to recent working sets when available; if history is sparse the plan falls back to generic load guidance.

[2026-01-03T03:16:30Z] Gym Chat sets CTE unification, window metadata, and planning hardening
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `lib/gym-chat/canonical-plans.ts`
  - `lib/gym-chat/sql-builders.ts`
  - `lib/gym-chat/workout-planner.ts`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/llm.ts`
  - `lib/gym-chat/semantics.ts`
  - `types/gym-chat.ts`
  - `scripts/gym-chat-canonical-sql.ts`
  - `eval/run-gym-chat-clarification-eval.ts`
  - `eval/run-gym-chat-multiturn-eval.ts`
  - `eval/run-gym-chat-workout-plan-eval.ts`
  - `app/demos/gym-dashboard/README.md`
- **Reason**:
  - Alias errors and window mismatches were still possible in canonical queries and planning paths.
  - Targeted muscle planning needed deterministic, history-backed weight suggestions when data exists.
  - Explanation failures needed richer, analysis-specific fallbacks without hard errors.
- **Key Changes**:
  - Introduced a shared sets CTE builder and migrated canonical/workout-plan SQL to use it, plus new guardrail checks.
  - Added canonical plans for session counts, set/volume rankings, and return-for-effort volume with consistent windows/limits.
  - Expanded conversation state with targets, hardened clarification parsing, and added deterministic planning responses.
  - Improved fallback summaries and updated eval scripts and documentation to reflect supported question types.
- **Related Conversation / Prompt**:
  - "Show my top 5 highest-weight sets from the last 90 days."
  - "How many sessions did I log in the last 8 weeks?"
  - "Help me plan my sets for quads using my previous lifts."

[2026-01-03T00:43:25Z] Gym Chat canonical cleanup for sets, split day, and weekly volume
- **Agent / Model**: GPT-5 (Builder Agent)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `app/demos/gym-dashboard/chat/ChatClient.tsx`
  - `lib/gym-chat/canonical-plans.ts`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/sql-policy.ts`
  - `types/gym-chat.ts`
  - `scripts/gym-chat-canonical-sql.ts`
  - `app/demos/gym-dashboard/README.md`
- **Reason**:
  - Simple ranking questions still hit `gym_lifts` alias errors.
  - Meta retry prompts and guardrails were blocking short, in-scope follow-ups.
  - Favorite split day lacked a canonical plan, and weekly volume metadata showed unknown windows.
- **Key Changes**:
  - Added canonical plans for top-weight sets, lowest-volume day, favorite split day, and weekly volume with shared lifts CTE usage.
  - Tightened follow-up/guardrail handling to stay in gym-data context and removed the unnecessary retry prompt.
  - Extended policy metadata to cover 30-day windows and ensured weekly-volume coverage lines reflect 12-month windows.
- **Related Conversation / Prompt**:
  - "Show my top 5 highest-weight sets from the last 90 days."
  - "what would you call my worst day of lifting in the past 30 days?"
- "what is my fav split day"
- "What was my weekly training volume over the last 12 months?"

[2026-01-03T01:23:09Z] Gym Chat quad-only planning constraints and history anchors
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `lib/gym-chat/conversation.ts`
  - `lib/gym-chat/llm.ts`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/workout-planner.ts`
  - `types/gym-chat.ts`
  - `eval/run-gym-chat-workout-plan-eval.ts`
  - `package.json`
- **Reason**:
  - Quad-only planning requests were drifting to calves, ignoring strict muscle constraints, and failing to use logged lifts for weight suggestions.
  - Follow-up corrections like "ONLY quads" were triggering generic guardrails instead of a focused correction.
- **Key Changes**:
  - Added explicit workout planning metadata for target muscle constraints and historical lift usage; persisted across follow-ups.
  - Added quad-focused planning queries with exercise-name filters and per-exercise weight anchors.
  - Introduced quad-only fallback templates plus a correction acknowledgement template when logs are missing.
  - Added a workout plan eval script and script hook.
- **Related Conversation / Prompt**:
  - "Help me plan my sets for Quads... Use my previous lifts to inform these decisions."
  - "Ensure your suggestions are ONLY for quads."

[2026-01-15T02:41:22Z] Gym Chat history/performance analyses (PRs, best sets, summaries, progression)
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `types/gym-chat.ts`
  - `lib/gym-chat/canonical-plans.ts`
  - `app/api/gym-chat/route.ts`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/capabilities.ts`
  - `lib/gym-chat/semantics.ts`
  - `app/demos/gym-dashboard/README.md`
- **Reason**:
  - Add canonical PR, best-set, per-exercise summary, and progression trend analyses for training history questions.
- **Key Changes**:
  - Added new analysis kinds with deterministic SQL plans using the shared sets CTE (optional exercise filters, 1RM mode, and all-time hinting).
  - Wired routing/response metadata and follow-ups for PRs, best sets, per-exercise summaries, and progression trends.
  - Expanded gym-chat capability/semantic hints to cover PRs, best sets, and per-exercise summaries.
- **Related Conversation / Prompt**:
  - "What are my PRs?"
  - "Show my best sets for incline press."
  - "How has bench progressed over the last year?"

[2026-01-15T11:36:36Z] Gym Chat period comparisons + adherence coverage
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `lib/gym-chat/canonical-plans.ts`
  - `lib/gym-chat/templates.ts`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/capabilities.ts`
  - `types/gym-chat.ts`
- **Reason**:
  - Ensure period comparisons honor explicit windows or defaults, include adherence metrics (streaks/gaps/missed weeks), and report both windows in coverage.
- **Key Changes**:
  - Added period-compare template hints, follow-ups, and coverage-line formatting for two-window outputs.
  - Expanded canonical period compare SQL with weekly streak/gap metrics and recent missed weeks/months queries.
  - Routed consistency/adherence questions to period comparisons with default windows when omitted.
- **Related Conversation / Prompt**:
  - "Compare the last 8 weeks vs the prior 8 weeks."
  - "How consistent am I?"
  - "Did I miss weeks in the last 12 weeks?"

[2026-01-14T18:45:30Z] Gym Chat period compare and adherence metrics
- **Agent / Model**: GitHub Copilot
- **Scope**:
  - `types/gym-chat.ts`
  - `lib/gym-chat/canonical-plans.ts`
  - `app/api/gym-chat/route.ts`
  - `app/demos/gym-dashboard/README.md`
- **Reason**:
  - Support time-window comparisons and adherence metrics (session frequency, consistency gaps, exercise breakdowns between periods).
  - Enable questions like "compare last 4 weeks to the prior 4", "how consistent am I", and "did I miss weeks".
- **Key Changes**:
  - Added buildPeriodComparePlan with three queries: overall stats (sessions, sets, volume), per-exercise breakdown, and frequency/gap analysis.
  - Added isPeriodCompareQuestion detection with keywords like "compare", "vs", "versus" plus time windows.
  - Added period_compare to ANALYSIS_KINDS array and routed in both override and fallback dispatch paths.
  - Wired PERIOD_COMPARE_REGEX for natural language matching.
- **Related Conversation / Prompt**:
  - "Compare my training last 4 weeks vs the prior 4 weeks.":
  - "How consistent am I over the last month?":
  - "Did I miss weeks in the last 12 weeks?"

[2026-01-15T17:14:48Z] Gym Chat set-level breakdown diagnostics
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `types/gym-chat.ts`
  - `lib/gym-chat/canonical-plans.ts`
  - `lib/gym-chat/templates.ts`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/capabilities.ts`
  - `lib/gym-chat/semantics.ts`
  - `app/api/gym-chat/route.ts`
  - `app/demos/gym-dashboard/README.md`
- **Reason**:
  - Add deterministic set-level fatigue/drop-off analysis with canonical SQL, anchor windows, and chart fallbacks.
- **Related Conversation / Prompt**:
  - "Break down my last session sets for squats."
  - "Do my last sets drop off on bench days?"

[2026-01-15T19:25:00Z] Gym Chat technique guidance, planning goals, and coverage clarity
- **Agent / Model**: GPT-5 (Codex)
- **Scope**:
  - `app/api/gym-chat/route.ts`
  - `lib/exercise-library.ts`
  - `lib/gym-chat/workout-planner.ts`
  - `lib/gym-chat/response-utils.ts`
  - `lib/gym-chat/capabilities.ts`
  - `types/gym-chat.ts`
  - `eval/gym-chat-questions.json`
  - `app/demos/gym-dashboard/README.md`
  - `README.md`
- **Reason**:
  - Add exercise technique guidance, goal-based programming, and deload messaging while simplifying coverage language for non-technical users.
- **Key Changes**:
  - Added a local exercise library with form cues and linked it into technique responses.
  - Added goal parsing for strength/hypertrophy/endurance and applied goal-based sets/reps/rest to planning.
  - Introduced deload recommendations from weekly volume variability and simplified coverage lines with a debug toggle.
- **Related Conversation / Prompt**:
  - "What cues for deadlift?"
  - "Plan a quads session with a hypertrophy focus."
  - "Do I need a deload based on my recent training volume?"
