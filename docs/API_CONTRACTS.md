# Implemented API foundation

All routes require `Authorization: Bearer <supabase_access_token>` issued to a user with a valid staff_memberships row.

## POST /api/walk-ins
Request: `{"sessionId":"uuid","name":"Patient Name","mobile":"9876543210"}`

Success (201): `{"data":{"appointment_id":"uuid","token_number":42}}`

Errors: 400 input, 401 unauthenticated, 403 unauthorized, 404 session missing, 409 session closed/booking conflict.

## POST /api/queue/reorder
Request: `{"sessionId":"uuid","entryId":"uuid","afterEntryId":null,"expectedVersion":3,"reason":"Patient returned"}`
Set `afterEntryId` to a waiting queue-entry UUID to place immediately after it; null moves entry to front.

Success (200): `{"queueVersion":4}`
Errors: 400 invalid, 401 unauthorized, 403 forbidden, 404 missing, 409 version conflict or invalid move.

## Planned (not implemented)
GET /api/doctors/nearby, POST /api/appointments, POST /api/appointments/:id/check-in, GET /api/queue/:sessionId, POST /api/consultations/:id/complete.

All sensitive reads will require correct role or a secure one-time/expiring tracking grant.
