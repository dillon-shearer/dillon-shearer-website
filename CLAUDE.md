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

# Gym chat evaluation suites (scripts not yet created)
npm run gym-chat:eval                    # Main evaluation
npm run gym-chat:clarification-eval      # Clarification handling
npm run gym-chat:multiturn-eval          # Multi-turn conversations
npm run gym-chat:top-end-compare-eval    # Top-end comparisons
npm run gym-chat:workout-plan-eval       # Workout planning
npm run gym-chat:quick-win-eval          # Quick win scenarios
```

## Testing Demos

```bash
# Start dev server
npm run dev

# Visit demos in browser:
# - http://localhost:3001/demos/gym-dashboard
# - http://localhost:3001/demos/data-access-portal
# - http://localhost:3001/demos/dillons-data-cleaner
```

**Mobile Testing:**
- Middleware redirects mobile users from unsupported demos to mobile-warning page
- Test mobile redirect: Resize browser to mobile width or use DevTools device emulation
- Allow-listed routes in `middleware.ts` permit mobile data entry forms
- Bot/crawler detection allows SEO indexing even on redirect-protected pages

**Gym Dashboard Specific:**
- Charts require data in Postgres database (gym_lifts table)
- Chat widget in bottom-right opens AI-powered workout analytics
- Test different time ranges: Day, 7d, 30d, YTD buttons
- Volume chart, heatmap, and body diagram all respond to selected time range

## High-Level Architecture

### Next.js App Router Structure

- **File-based routing** in `app/` directory with nested layouts
- **Server components by default** - mark with `'use client'` for interactivity
- **API routes** in `app/api/` - 8 endpoint directories for various services
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
- **Custom hooks** in `app/components/hooks/` for reusable UI logic
- **Interactive components**: MagneticButton, animated cards, scroll-based reveals

### UI Conventions

**Global CSS Design System (`app/global.css`):**
- CSS variables for all colors, spacing, typography (see `:root` section)
- Utility classes: `.card-base`, `.card-hover`, `.card-accent`, `.btn-primary`, `.btn-secondary`, `.input-base`, `.badge-base`
- Text opacity: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`, `var(--text-muted)`
- Backgrounds: `var(--bg-subtle)` for hover states, `var(--border-primary)` for borders
- Always use CSS variables instead of hard-coded colors or Tailwind utilities for consistency

**Header/Navigation (`app/components/nav.tsx`):**
- Fixed positioning with hide-on-scroll (down) / show-on-scroll (up) behavior
- Mobile overlay is full-screen with close button in top-right
- Main layout requires `pt-20` spacing to account for fixed header
- Color scheme: `#54b3d6` (cyan accent), dark background, white/60 for secondary text

**Professional Styling Standards:**
- Text opacity levels: `white` (primary), `white/60` (secondary), `white/50` (tertiary), `white/40` (muted)
- Subtle backgrounds: `white/[0.03]` for hover states, `white/10` for borders
- Spacing follows Tailwind's refined scale: `gap-2.5`, `py-3.5`, `space-y-3.5`
- Transitions: 200-300ms for hovers, 300-400ms for layout shifts

**Modern Card Pattern (Established Feb 2026):**
- Card background: `bg-white/[0.02]` with `border border-white/10`
- Hover enhancement: `hover:border-white/20` or `hover:border-[#54b3d6]/30`
- Hover overlays: `<div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />`
- Numeric data: Always use `font-mono` with `style={{ fontVariantNumeric: 'tabular-nums' }}` for perfect alignment
- Glassmorphic modals: `bg-black/95 backdrop-blur-sm border border-white/20`
- Replace old patterns: `bg-gray-900 border-gray-800` → `bg-white/[0.02] border-white/10`

**Component Update Pattern:**
When updating multiple similar components (e.g., cards, tables):
1. Use `Edit` tool with `replace_all: true` for bulk pattern updates
2. Test one component first, then batch update the rest
3. Common color migrations: `text-gray-400` → `text-white/40`, `border-gray-700` → `border-white/10`

## Development Workflow

### Work Tracking
- Use `git status` to see current changes
- Create meaningful commits after logical milestones
- For large refactors, consider feature branches
- Git commit messages should include `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>` when AI-assisted

### Optional: AI Agent Coordination
For structured multi-agent workflows, this project has:
- `.ai/HANDOFF.md` - Append-only log of agent context and decisions
- `.ai/AGENTS.md` - Agent coordination guidelines
- `.ai/outputs/` - Generated files and artifacts

These are optional tools for complex agent handoffs, not required for normal development.

## Important Gotchas

### Type Safety

- TypeScript `ignoreBuildErrors: true` is temporarily set in `next.config.js`
- Fix type errors rather than relying on this setting

### Server Components

- **Default is Server Component** - All components in `app/` are Server Components unless marked with `'use client'`
- **No event handlers** - Cannot use `onClick`, `onMouseEnter`, etc. in Server Components
- **Use CSS for interactions** - Prefer Tailwind hover utilities (`hover:bg-white/10`) over JS event handlers
- **Client Components** - Add `'use client'` directive at top of file when you need interactivity

### Testing

- **Test infrastructure**: `npm test` expects `tests/koreader-remote.test.ts` which doesn't exist yet - test setup is incomplete
- **Gym chat eval scripts**: Defined in package.json but corresponding files in `eval/` directory don't exist yet
- **TypeScript execution**: All scripts use `tsx` (not ts-node) for running TypeScript files

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

### Layout & Spacing

- Header uses `fixed` positioning (not `sticky`) with hide-on-scroll behavior
- Main content requires `pt-20` to prevent overlap with fixed header
- Footer spacing: `mt-20` for professional separation from content
- Hero title: `.hero-title` class has `margin-top: 0` for tight spacing between name and tagline

## Key Technologies

- **Framework**: Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS v4 alpha + PostCSS (⚠️ alpha version - expect potential breaking changes)
- **Database**: Vercel Postgres + native pg driver
- **Content**: MDX with remark-gfm for GitHub Flavored Markdown
- **Visualization**: Recharts for charts, Three.js for 3D
- **PDF/Excel**: @react-pdf/renderer, ExcelJS
- **Email**: Resend API
- **TypeScript**: v5.3.3 with strict typing (see `types/` directory)

## Environment Setup

Required environment variables in `.env.local`:
- `POSTGRES_URL` - Vercel Postgres connection string
- `RESEND_API_KEY` - For email notifications (DAR system)
- `ANTHROPIC_API_KEY` - For gym chat LLM integration

## Troubleshooting

### Dev Server Won't Start
```bash
# Check if port 3001 is in use (Unix/Mac)
lsof -i :3001

# Check if port 3001 is in use (Windows)
netstat -ano | findstr :3001

# Kill process if needed (Unix/Mac)
kill -9 <PID>

# Kill process if needed (Windows)
taskkill /PID <PID> /F

# Or use a different port temporarily
npm run dev -- -p 3002
```

### Build Errors
- **Type errors**: `ignoreBuildErrors: true` is set in `next.config.js` - fix type errors rather than relying on this
- **Missing env vars**: Verify `.env.local` has all required keys (see Environment Setup)
- **Postgres connection**: Test with `npm run sql` - should connect without errors
- **Module not found**: Run `npm install` to ensure dependencies are installed

### Gym Chat Not Working
- Verify `ANTHROPIC_API_KEY` in `.env.local`
- Check browser console for 30-second timeout errors (LLM calls have 30000ms timeout)
- LLM calls log to server console - check terminal output for API errors
- SQL validation errors appear in chat UI - read the error message for specific policy violations

### Component Styling Issues
- If cards/components look wrong after updates, check for missed pattern migrations
- Old pattern: `bg-gray-900 border-gray-800` should be `bg-white/[0.02] border-white/10`
- Use browser DevTools to inspect applied classes
- Clear Next.js cache: `rm -rf .next` then `npm run dev`

## Local Overrides

Create `.claude.local.md` in the project root for personal preferences not shared with the team. Add to `.gitignore` to keep it local:
```
# Add to .gitignore
.claude.local.md
```
