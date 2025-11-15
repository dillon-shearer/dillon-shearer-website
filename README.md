# Dillon Shearer – Product Site & Demo Lab

A Next.js 15 app router project that powers my personal marketing site, long-form writing, and a collection of enterprise-style demos (data access portal, gym analytics, API docs, etc.). It doubles as a playground for experimenting with Tailwind v4, Vercel Postgres, and Resend-powered workflows.

## Features

- **Marketing Surface** – Responsive home/about/contact sections with custom OG image routes, RSS, sitemap, JSON-LD, and Geist typography.
- **Content System** – MDX-powered blog & changelog with automatic syntax highlighting, dynamic OpenGraph images, and RSS feed generation.
- **Data Access Portal Demo** – Admin table + download console with API-key unlock, status events, email notifications (Resend), CSV/ZIP exports, palette persistence per key, and API docs.
- **Interactive Demos** – Gym dashboard visualizations (Recharts + Canvas), API showcase, and 3D experiments via `@react-three/fiber`.
- **Back-office Utilities** – Postgres-backed status logging, reminder notes, and helper scripts (`pnpm sql`) for running migrations/seeding.
- **Production Tooling** – Tailwind CSS v4, TypeScript, ESLint defaults from Next.js, Vercel analytics/speed insights, and automatic OG image rendering.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Styling:** Tailwind CSS v4 alpha, `global.css`, and custom gradients
- **Content:** MDX/Markdown via `next-mdx-remote`
- **Data:** Vercel Postgres (`@vercel/postgres`), server actions, JSZip for bundling assets
- **Email/Automation:** Resend API + contact form actions
- **Visuals:** Recharts, `@react-three/fiber`, `@react-three/drei`

## Project Structure

```
app/
├── page.tsx, layout.tsx, global.css
├── about, contact, api-docs, blog (MDX routes)
├── demos/
│   ├── data-access-portal/ (admin + download UIs, API routes)
│   ├── gym-dashboard/ (forms + Recharts visualizations)
│   └── jupyter/, og/, rss helpers
├── api/ (Next.js Route Handlers for requests, gym data, contact)
└── og/, sitemap.ts, robots.ts
lib/        # data access helpers, demo data
public/     # static assets and favicons
scripts/    # `run-sql.ts` helper
```

## Environment Variables

Create `.env.local` with the variables your deployment needs:

```
POSTGRES_URL=...
DATABASE_URL=...           # optional alias used by sql script
RESEND_API_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
LIFT_PASSWORD=super-secret  # used by the gym dashboard demo
```

## Getting Started

```bash
npm install
npm run dev            # http://localhost:3000
```

Other handy scripts:

| Command      | Description                                  |
|--------------|----------------------------------------------|
| `npm run build` | Production build                              |
| `npm run start` | Run the built app                             |
| `npm run sql`   | Execute `scripts/run-sql.ts` against Postgres |

## Deploying

Deploy on [Vercel](https://vercel.com/) with the repo connected. Set the env vars above and configure a Vercel Postgres database + Resend API key. The OG image and RSS routes are zero-config on Vercel.

## Contributing / Forking

This project is tailored to my workflow but feel free to fork it. If you add demos or extend the CMS, keep an eye on:

- Updating `lib/data-access-portal.ts` when new metadata is needed
- Extending `app/api` handlers for any new dataset logic
- Adding MDX files under `app/blog/(posts)` for new articles

Enjoy exploring the demos and adapting them to your own stack.