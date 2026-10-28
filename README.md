# MediQueue — Doctor Appointment + Hybrid Queue Web App

Next.js + TypeScript + Supabase application with distinct Patient, Clinic Admin, Reception, and Doctor screens.

**Status:** Working-code MVP under development. Features need Supabase configuration, a database migration, and integration/security testing before production use. Not yet deployed.

## Screens
- `/login` — Email/password registration and login, Google OAuth (requires Supabase provider setup).
- `/admin` — First-clinic setup, doctor onboarding, OPD session and slot, staff email invitation, doctor verification for authorized platform reviewer.
- `/doctors` — Verified doctor list, active session selection, online booking.
- `/appointments` — Logged-in patient's booking history.
- `/reception` — Walk-in token generation, queue list, check-in, skip, rejoin, cancel.
- `/doctor` — Queue and consultation start/completion.
- `/api/app` — Authenticated API for portals.

## Setup
1. Install Node.js 20+ and run `npm install`.
2. Create a Supabase project.
3. Run `supabase/migrations/0001_initial.sql`, then `supabase/migrations/0002_working_mvp.sql` in the SQL editor.
4. Copy `.env.example` to `.env.local`; configure project URL, anon/publishable key, and **server-only** service role key.
5. Set `BOOTSTRAP_ADMIN_EMAIL` to your own **confirmed** Supabase email for initial clinic setup. The bootstrap works only while `organizations` is empty.
6. Set `PLATFORM_VERIFIER_EMAIL` to the confirmed email authorized to verify doctor credentials. Verify genuine medical registration independently before approving doctors. For this MVP verifier must also have clinic admin access to use the UI.
7. Enable Email auth in Supabase; optionally enable Google OAuth and configure redirect URLs.
8. Run `npm run dev` and open `http://localhost:3000/login`.
9. Create an account with bootstrap email, confirm it, sign in, create clinic at `/admin`, add doctor and OPD session, verify doctor with the configured reviewer, and open session.
10. Invite reception staff through Admin. For live patient trials, do a security assessment and use patient consent procedures first.

## Important limitations
- The React portals and API foundation have **not been end-to-end tested against a configured Supabase instance** in this environment.
- Live updates currently use 5-second polling; websocket realtime and predictive ETA are pending.
- Nearby geolocation/maps, clinic QR, complete online self check-in, reminders, drag-and-drop reorder UI, token printing, mobile verification for recovering walk-in records, SaaS billing, and comprehensive test coverage are pending.
- Admin doctor approval has a platform reviewer guard but requires external identity/license checks; it is not an automated validation system.
- The base functions and migration are initial implementations; review authorization and transaction behavior before accepting medical information.
- Service-role key must **never** be exposed to browser code or committed to GitHub. `.env.local` is ignored.

Project roadmap: `docs/BUILD_PLAN.md` and `docs/ANTIGRAVITY_MASTER_PROMPT.md`.
