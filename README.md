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
OPENAI_API_KEY=...          # required for gym chat
GYM_CHAT_DATABASE_URL_READONLY=... # read-only gym chat connection string
GYM_CHAT_MODEL=gpt-4o-mini  # optional model override
OPENAI_API_BASE_URL=https://api.openai.com/v1 # optional override
```

## Getting Started

```bash
npm install
npm run dev            # http://localhost:3000
```

## Gym Chat Setup (SQL-to-LLM)

This demo runs an LLM-powered chat over the gym dataset with strict SQL safety checks.

1) Install dependencies:
```bash
npm install
```

2) Create `.env.local` with the required environment variables:
```
POSTGRES_URL=...
POSTGRES_URL_NON_POOLING=...
OPENAI_API_KEY=...
GYM_CHAT_DATABASE_URL_READONLY=...
GYM_CHAT_MODEL=gpt-4o-mini
OPENAI_API_BASE_URL=https://api.openai.com/v1
```

Notes:
- `GYM_CHAT_DATABASE_URL_READONLY` should point to a read-only connection string. In development only, the API falls back to `POSTGRES_URL_NON_POOLING` or `POSTGRES_URL` if the read-only var is missing (and logs a warning).
- `GYM_CHAT_MODEL` and `OPENAI_API_BASE_URL` are optional overrides.

3) Optional policy sanity check:
```bash
npm run gym-chat:policy
```

4) Run the app and visit the chat page:
```bash
npm run dev
```
Open `http://localhost:3000/demos/gym-dashboard/chat`.

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

## KOReader Remote Demo

The `/koreader-remote` surface lets you flip KOReader pages from your phone or laptop while your Kindle stays on a stand nearby. It never proxies LAN traffic through a server—commands originate from the browser that you have open.

### Prerequisites

1. On your Kindle, open KOReader and enable the HTTP remote server (Tools → Remote control).
2. Note the IP and port displayed in KOReader (e.g., `192.168.1.67:8080`).
3. Connect your phone/computer and Kindle to the same Wi-Fi network or hotspot.

### Using the demo

1. Open `https://www.datawithdillon.com/koreader-remote` (or `http://localhost:3000/koreader-remote` during development).
2. Enter the KOReader IP & port into the form and hit **Save**. The value persists in `localStorage` so it is remembered in that browser.
3. Tap **◀ Page Up** or **Page Down ▶**. The page issues `fetch()` calls with `mode: "no-cors"` directly to your Kindle.

### Troubleshooting

- Double-check that the IP & port in KOReader match what you saved.
- Ensure the Kindle is awake and KOReader’s HTTP server is still running.
- Keep the browser and Kindle on the same LAN; remote or cellular networks will not work.
- Some browsers block HTTP requests from HTTPS pages. If that happens, open the site via HTTP on your LAN or allow mixed content for the page.
