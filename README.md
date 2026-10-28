# MediQueue

Multi-clinic doctor discovery and receptionist-controlled unified appointment queue.

> Development scaffold. Not yet deployed or approved for real patient data.

## Stack
Next.js 15, React 19, TypeScript, Supabase PostgreSQL.

## Quick start
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill Supabase variables.
3. Run SQL in `supabase/migrations/0001_initial.sql` using the Supabase SQL editor.
4. `npm run dev`

See `docs/BUILD_PLAN.md` for remaining features and production hardening.

Never commit `.env.local`, service-role keys, or patient records.
