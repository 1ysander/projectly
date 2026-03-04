# Projectly

A shipping management web app for tracking shipments, returns, and connections — built with React, Vite, and Supabase.

## Features

- **Shipments** — create and track outbound shipments with status updates and detail views
- **Returns** — manage inbound returns with full return detail tracking
- **Connections** — address book / carrier connections panel
- **Analytics** — shipping performance dashboard
- **Onboarding** — guided setup flow for new users
- **Settings** — account and preference management

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (Postgres + Auth) |
| UI components | shadcn/ui (MIT), Unsplash photos |

## Getting started

```bash
npm install
npm run dev
```

Requires a Supabase project — set your credentials in a `.env` file:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Project structure

```
src/
  app/
    pages/        # Route-level page components
    components/   # Shared UI components
    hooks/        # Custom React hooks
    context/      # App-wide state/context
  styles/         # Global CSS
supabase/         # DB schema and migrations
```

## Attributions

- UI components from [shadcn/ui](https://ui.shadcn.com/) — MIT license
- Photos from [Unsplash](https://unsplash.com) — Unsplash license
