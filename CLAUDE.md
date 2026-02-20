# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on localhost:5173
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture

**Stack:** React 18 + TypeScript + Vite + Tailwind v4 + shadcn/ui + Supabase + React Query + react-router-dom v6 + sonner

**Tailwind:** Uses `@tailwindcss/vite` plugin (no `tailwind.config.js`). Design tokens are HSL CSS custom properties in `src/index.css`. Import is `@import "tailwindcss"`.

**Path alias:** `@/` maps to `src/`. Defined in both `vite.config.ts` and `tsconfig.app.json` (root `tsconfig.json` also needs `paths` for shadcn CLI).

**Supabase types:** `src/integrations/supabase/types.ts` contains a manually maintained `Database` type. Every table needs `Relationships: []` (or a real array) and every table's `Update` type must have at least one optional field (not `Record<string, never>`) for supabase-js v2.97+ to resolve insert/update types correctly. The `Functions` type requires all `Args` properties to be required (not optional) for RPC calls to type-check.

**Auth:** `src/hooks/useAuth.ts` — `useAuth()` returns `{ user, profile, loading }`. Wraps `supabase.auth.onAuthStateChange` + profile fetch from `profiles` table.

**Routing:** `src/App.tsx` — `ProtectedRoute` redirects unauthenticated → `/`. `PublicOnlyRoute` redirects authenticated → `/dashboard`. All protected pages use `Header` component.

**Data fetching:** React Query (`useQuery`) throughout. `staleTime: 30_000` globally. Query keys follow pattern `['resource', id?, refreshKey?]`.

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `Landing.tsx` | Waitlist form + auth modal (sign in / sign up / forgot password) |
| `/dashboard` | `Dashboard.tsx` | Task selector, stopwatch timer, leaderboard, personal times |
| `/feed` | `Feed.tsx` | Activity feed with like/unlike |
| `/review` | `Review.tsx` | Monthly/yearly stats breakdown |
| `/stats` | `Stats.tsx` | Personal stat cards (total, time, best, streak) |
| `/people` | `People.tsx` | Discover / Following / Followers tabs |
| `/profile` | `Profile.tsx` | Edit username and location |
| `/admin` | `Admin.tsx` | Waitlist table + CSV export (admin-only, checks `has_role` RPC) |
| `/reset-password` | `ResetPassword.tsx` | Handles Supabase `PASSWORD_RECOVERY` event |

## Database

SQL migration at `supabase/migrations/001_initial.sql`. Tables: `profiles`, `task_types`, `tasks`, `task_likes`, `user_relationships`, `achievements`, `user_roles`, `waitlist`. Includes RLS policies, `handle_new_user()` trigger (auto-creates profile on signup), `has_role()` function, and 10 seeded task types.

To apply: run the SQL in your Supabase dashboard SQL editor, or use `supabase db push` with the Supabase CLI.

## Environment

Copy `.env.example` → `.env.local` and fill in:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
