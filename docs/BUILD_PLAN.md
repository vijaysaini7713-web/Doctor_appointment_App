# MediQueue phased development plan

## Current status
Initial Next.js project and PostgreSQL migration are included. This is an **early development scaffold**, not a completed production system.

### Phase 1: Infrastructure
- [x] Next.js/TypeScript project skeleton
- [x] Schema for clinics, doctors, patients, sessions, appointments and queue
- [x] Authenticated walk-in and receptionist reorder API foundation
- [ ] Email / Google login UI with secure session management
- [ ] Seed/demo tenant and clinic onboarding
- [ ] CI lint/build/test workflow

### Phase 2: Working pilot
- [ ] Receptionist UI: register patient, open session, call next, skip and return
- [ ] Doctor consultation start / complete / pause
- [ ] Online appointment API with capacity enforcement and idempotency
- [ ] Patient-facing booking and check-in flow
- [ ] Cross-user race condition tests and optimistic queue version handling

### Phase 3: Real-time
- [ ] Clinic-scoped realtime subscriptions with server authorization
- [ ] Reconnect recovery and live ETA rolling average
- [ ] Public token-only queue display and secure personal tracking QR
- [ ] Notifications with explicit patient consent

### Phase 4: SaaS & launch
- [ ] Location search and mapping
- [ ] Clinic subscription billing and analytics
- [ ] Accessibility, load tests, security assessment and DPDP legal review
- [ ] Staging deployment before accepting real patient data

## Key operational rules
Online and walk-in patients share one doctor-session queue. Token number never changes when staff reorder a patient. Every manual reorder is audited with a reason. Online slots are preferences, not guarantees. Staff cannot view other clinics' patient records. Patient details never appear on public queue boards.

## Run locally
Use Node 20+ (or supported LTS), `npm install`, copy `.env.example` to `.env.local`, configure Supabase project, run `0001_initial.sql`, then `npm run dev`.

**Security note:** Service-role credentials must only be deployed server-side. Do not put real patient data in a demo environment. API error paths should not reveal internal database details.
