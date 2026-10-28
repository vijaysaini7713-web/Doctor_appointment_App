# MediQueue delivery checklist

## Implemented code
- Next.js landing, email / Google auth UI
- Patient doctor list, session booking and My Appointments
- Clinic Admin: bootstrap clinic, add doctor, medical registration field, create sessions, invite staff
- Platform reviewer guard for doctor approval (credentials must be checked outside the app)
- Receptionist walk-in token registration and token status management
- Doctor queue page, consultation start and completion
- Supabase tables, basic RLS deny-by-default, transactional database functions and audited queue changes
- API authorization and Zod validation foundation

## Must finish/test before production
1. Configure Supabase and execute migrations.
2. Resolve build/typecheck errors, if any; run integration tests with test tenant and dummy patients.
3. Add consistent auth cookie/session strategy, role routing and password reset.
4. Add clinic-specific timezone presentation, preferred slot limits, arrival grace and patient self check-in.
5. Add live realtime subscriptions and reliable ETA.
6. Implement manual reorder UI, QR code tracking and WhatsApp consent.
7. Verify staff/doctor identities, strengthen platform verifier workflow and audit reviewer.
8. Test simultaneous bookings, two-clinic isolation, rate limiting, cancellations, no-shows, recovery.
9. Conduct security and privacy compliance review before medical/patient use.
10. Deploy staging then production and connect custom domain.

## Known boundary
A GitHub commit is NOT an operational deployment. Never use real patient records in unreviewed environments.
