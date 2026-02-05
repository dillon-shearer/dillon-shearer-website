# HANDOFF LOG

## Status Log
- 2026-01-28: Initialized handoff log for gym chat refactor work.
- 2026-01-28: Reapplied gym-chat tool-use refactor in C:\Users\dills\dillon-shearer-website (route.ts, llm.ts, conversation.ts stub, simplified types, ChatClient merge logic).
- 2026-01-28: Increased LLM timeout to 30000ms in lib/gym-chat/llm.ts.
- 2026-01-28: Added system-prompt rule to only reference sets alias outside the sets CTE and avoid gym_lifts.* in outer queries.
- 2026-02-01: Created CLAUDE.md documentation file for future Claude Code instances. Includes development commands, high-level architecture overview, AI agent workflow rules, and important gotchas specific to this codebase.
- 2026-02-02: Reviewed layout and header/footer structure for full-width issue; prepared investigation plan (no code changes).
- 2026-02-02: Moved Navbar/Footer outside the max-width site shell and constrained only page content to restore full-width header/footer background.
- 2026-02-02: Removed the plain Contact nav item so only the CTA button remains (app/components/nav.tsx).
- 2026-02-02: Diagnosed staging failure as untracked reserved filename
ul; removed it via extended path delete so Git can add files again.
- 2026-02-02: Hid global header/footer on /koreader-remote by extending EmbedToggle to apply embed-preview mode for fullscreen routes (prevents chrome overlap on mobile).
- 2026-02-02: Overhauled /demos landing page to align with unified design system: replaced custom gradient header with standard .section-label/.section-title pattern used on blog/contact pages; reorganized CTAs into separate cards using .card-base utility (Jupyter notebooks with purple accent, contact with .btn-primary).
- 2026-02-02: Modernized demo cards (app/components/demo-card.tsx) from legacy colors (bg-[#0c1424], border-gray-200) to design system patterns (bg-white/[0.02], border-white/10); refined status badges with border accents; updated all text to semantic opacity levels (text-white/50, text-white/40, text-white/70); enhanced "See more" button with brand cyan hover state.
- 2026-02-02: Fixed demo modal (app/components/demo-modal.tsx) status logic: changed from isInProgress to isAccessible so "ongoing" demos show "Explore full demo" link while only truly "in-progress" demos show "Demo coming soon"; modernized modal styling to match design system (glassmorphic bg-black/95 backdrop-blur-sm, border-white/20, semantic text colors, brand cyan accents).
- 2026-02-02: Made "in-progress" demos completely non-interactive: removed "Open demo" hover overlay and click navigation for demos not marked as "live" or "ongoing"; static preview only until status changes (demo-card.tsx isAccessible check).
- 2026-02-02: Unified demo grid spacing (app/components/demo-grid.tsx) to consistent gap-6 across all breakpoints for mobile/desktop parity.
