# MediQueue — implementation prompt for Google Antigravity

You are implementing a multi-tenant doctor discovery and receptionist-controlled queue SaaS in the existing repository. Inspect existing code first. Use Next.js TypeScript and Supabase PostgreSQL. Make incremental, testable changes rather than replacing working code.

Product requirements:
1. Patient account: email/password or Google OAuth, personal/family bookings, preferred doctor session/time slot, live queue tracking.
2. Walk-in: receptionist enters patient name and mobile (no OTP), receives unique token.
3. Online and walk-in join the exact same queue for a doctor session.
4. Token number is immutable; queue position is mutable and staff-controlled with mandatory audit reason.
5. Check-in/skip/rejoin/no-show policies are configurable per clinic; patients who haven't arrived aren't called automatically.
6. Doctor: consultation start, complete, pause and authorized emergency escalation.
7. Realtime: clinic-secured queue changes, reconnect snapshot recovery, rolling ETA (not guaranteed arrival time).
8. Privacy: public display shows tokens only; no public mobile number or names; strong staff role checks.
9. Multi-tenant: every clinic-scoped query must check access; do not expose service-role credentials.
10. Add tests for simultaneous issuance, reorder races, unauthorized access, no-shows and tenant isolation.

Current repo contains initial DB migration and authenticated foundation APIs; read docs/BUILD_PLAN.md and docs/API_CONTRACTS.md. Prioritize implementing Phase 2's real UI and appointment endpoints. Do not claim a screen is functional unless it works against the database. Run typecheck and build. Report remaining limitations clearly. Never add real patient data or secrets.
