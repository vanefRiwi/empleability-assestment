# Architecture Decision Record

This document records the initial decisions made for the Engine Repair Assessment. These decisions apply to the documented MVP and can be revisited if the assessment statement requires additional behavior.

## ADR-001: Persist the current repair approval on the repair order

- **Status:** Accepted for the initial scope.
- **Decision:** Store `approval_status`, `approved_at`, and `approval_notes` on `repair_orders`.
- **Allowed states:** `NOT_REQUIRED`, `PENDING`, `APPROVED`, `REJECTED`.
- **Rule:** When approval is required, the order must not transition from `AWAITING_APPROVAL` to `IN_REPAIR` unless the current approval state is `APPROVED`.
- **Rationale:** The current scope needs to represent one current decision and enforce a business rule without introducing a separate entity prematurely.
- **Trade-off:** This does not provide a complete audit history of multiple approval requests, revised estimates, or repeated decisions. If those are explicit requirements, introduce a separate `repair_approvals` table.
- **Consistency:** Keep the current order status and its `repair_status_history` row synchronized in one transaction. Approval notes are not a substitute for a full audit trail.

## ADR-002: User creation is administrator-only

- **Status:** Accepted for the initial scope.
- **Decision:** Disable public self-registration. Only an authenticated `ADMIN` can create accounts through `POST /api/v1/users`.
- **First administrator:** Provision through a controlled bootstrap procedure; do not expose a public endpoint that grants administrator privileges.
- **Rationale:** The application is modeled as an internal repair-management system, so account creation should be controlled.
- **Security requirements:** Hash passwords using Argon2id or another approved modern password-hashing algorithm; never return password hashes; enforce authorization in Express; do not rely on frontend visibility to protect endpoints.
- **Trade-off:** A demo or deployment must complete the admin bootstrap before users can be managed.

## ADR-003: Preserve service and database ownership boundaries

- **Status:** Accepted.
- **Decision:** Express owns authentication, users, roles, and token issuance. FastAPI owns clients, engines, repair orders, approval state, and status history. The PostgreSQL server hosts separate authentication and business databases.
- **Rationale:** This preserves the current architecture and prevents cross-service database coupling.
- **Security contract:** Express signs RS256 access tokens with the private key; FastAPI validates tokens with public key(s) and enforces business authorization.

## Implementation follow-up

1. Verify these decisions against the exact assessment statement, especially whether it requires a full approval audit trail or a specific registration flow.
2. Implement SQLModel persistence models and reviewed Alembic migrations only after the application-code phase is explicitly approved.
3. Implement admin bootstrap, protected user creation, approval validation, and tests.
4. Finalize the exact API route and payload used to record an approval decision before implementing that endpoint.
