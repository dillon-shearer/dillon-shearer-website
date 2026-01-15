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