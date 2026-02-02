# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server (runs on port 3001)
npm run dev

# Production build
npm run build

# Run tests
npm test

# Execute SQL migrations/scripts
npm run sql

# Gym chat SQL policy validation
npm run gym-chat:policy

# Gym chat canonical SQL generator
npm run gym-chat:canonical-sql

# Gym chat evaluation suites
npm run gym-chat:eval                    # Main evaluation
npm run gym-chat:clarification-eval      # Clarification handling
npm run gym-chat:multiturn-eval          # Multi-turn conversations
npm run gym-chat:top-end-compare-eval    # Top-end comparisons
npm run gym-chat:workout-plan-eval       # Workout planning
npm run gym-chat:quick-win-eval          # Quick win scenarios
```

## High-Level Architecture

### Next.js App Router Structure

- **File-based routing** in `app/` directory with nested layouts
- **Server components by default** - mark with `'use client'` for interactivity
- **API routes** in `app/api/` - 15+ endpoints for various services
- **Middleware** at root (`middleware.ts`) handles mobile detection and routing

### Gym Chatbot System

The gym analytics chatbot (`lib/gym-chat/`) is the most complex subsystem:

- **LLM-based agent** using Claude API with tool-use pattern
- **SQL generation** from natural language via `lib/gym-chat/llm.ts`
- **Query validation** through `lib/gym-chat/sql-policy.ts` enforces safety rules:
  - Only reference `sets` alias outside the `sets` CTE
  - Avoid `gym_lifts.*` in outer queries
  - Auto-parameterization of string literals
  - CTE reference validation
- **Timeout**: LLM calls have 30000ms timeout
- **Multi-turn conversations** with state management in `lib/gym-chat/conversation.ts`
- **Chart generation** creates Recharts specifications for visualization
- **Analysis types**: muscle group balance, progression tracking, volume analysis, deload recommendations

### Data Access Portal (DAR)

Located in `app/demos/data-access-portal/`:

- **Admin request management** with status event tracking
- **API-key based unlock** mechanism for download access
- **CSV/ZIP exports** using ExcelJS and JSZip
- **Email notifications** via Resend API
- **Palette persistence** per API key
- **OpenAPI documentation** generation at `/api/openapi`

### Database Architecture

- **Vercel Postgres** (`@vercel/postgres`) for persistent storage
- **Server Actions** handle mutations
- **SQL scripts** in `scripts/` directory - run via `npm run sql`
- **pgsql-ast-parser** used for SQL query parsing and safety validation
- Seed scripts: `scripts/seed-dar-requests.sql`

### Content System

- **MDX-powered blog** at `app/blog/` with `next-mdx-remote`
- **Automatic syntax highlighting** via `sugar-high`
- **Dynamic OpenGraph images** at `/og/` routes
- **RSS feed generation** at `/rss/`
- **Markdown frontmatter** parsing for metadata

### Component Patterns

- **Demo shells** with mobile detection - middleware redirects unsupported pages
- **Embedded mode** via `?embed=1` query parameter for visualization embedding
- **Marketing components** (hero, about, contact) in `app/components/`
- **3D visualizations** using `@react-three/fiber` and Three.js

## AI Agent Workflow

This project uses a structured `.ai/` directory for agent coordination:

### Handoff Log (MANDATORY)

All development work must update `.ai/HANDOFF.md`:

- **Single source of truth** for context, decisions, and changes
- **Append-only** - never delete or rewrite prior entries
- **Status Log section** with dated entries (YYYY-MM-DD format)
- Update after ANY meaningful work

### Output Management

- All generated files go under `.ai/outputs/`
- Never create outputs outside this directory
- List all outputs in handoff log Output Manifest

### Role-Based Instructions

- `.ai/roles/BUILDER.md` - Implementation guidelines
- `.ai/roles/PLANNER.md` - Planning and scope definition
- See `.ai/AGENTS.md` for core principles

## Important Gotchas

### Type Safety

- TypeScript `ignoreBuildErrors: true` is temporarily set in `next.config.js`
- Fix type errors rather than relying on this setting

### Mobile Detection

- Middleware redirects mobile users from unsupported demos
- Allow-listed routes for mobile data entry exist
- Bot/crawler detection allows SEO indexing

### Gym Chat SQL Rules

When working on gym chat queries:
- Only reference the `sets` alias outside the `sets` CTE
- Avoid `gym_lifts.*` in outer queries - be explicit with column names
- String literals in SQL are auto-parameterized for safety
- CTE references are validated before execution

### Remote Image Patterns

- `picsum.photos` is allowed for placeholder images
- Configure in `next.config.js` if adding new image sources

### Development Server

- Runs on **port 3001** (not 3000) - check `package.json`
- Allowed dev origins: `localhost:3000` and `192.168.1.207:3000`

## Key Technologies

- **Framework**: Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS v4 alpha + PostCSS
- **Database**: Vercel Postgres + native pg driver
- **Content**: MDX with remark-gfm for GitHub Flavored Markdown
- **Visualization**: Recharts for charts, Three.js for 3D
- **PDF/Excel**: @react-pdf/renderer, ExcelJS
- **Email**: Resend API
- **TypeScript**: v5.3.3 with strict typing (see `types/` directory)
