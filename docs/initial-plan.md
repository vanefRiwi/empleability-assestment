# Initial Technical Planning

This plan tracks the work needed to satisfy the assessment statement. The approved design lives in:

- [architecture.md](architecture.md): services, layers, persistence, JWT.
- [data-model.md](data-model.md): tables, constraints, statuses, transitions.
- [api-contract.md](api-contract.md): endpoints, claims, roles, errors.
- [decisions.md](decisions.md): ADRs (approval state, admin-only users, ownership boundaries).

## 1. End-to-end acceptance scenario

1. An administrator (bootstrapped) signs in through the authentication API and creates an operator.
2. The operator signs in and the frontend stores the RS256 access token.
3. The operator registers a client and an engine owned by that client.
4. The operator creates a repair order for the engine; the order starts in `RECEIVED` with its first history row.
5. The operator advances the order through valid transitions, including the approval rule, and sees the history.
6. The business API rejects missing, expired, tampered, or wrong issuer/audience tokens.

## 2. Gaps between the statement and the current documentation

These items are required or explicitly valued by the statement and are not yet covered by the approved documents:

- **Editing clients and engines.** Section 4.5 asks for list, create, edit and detail views; section 3 says no modification flow is required. Decision: add `PATCH /clients/{id}` and `PATCH /engines/{id}` (including logical deactivation) so both readings are covered. Repair orders are only created, listed, viewed, and moved through status transitions.
- **Repair order filters.** Section 4.5 asks for search and filters by status, client or engine. Define query parameters (`status`, `client_id`, `engine_id`, `q`) and pagination for `GET /repair-orders`.
- **Dashboard summary.** Section 4.5 asks for a summary of orders by status. Add `GET /repair-orders/summary` (counts per status) or document that the frontend aggregates the list.
- **Approval endpoint.** Finalize the route and payload that record an approval decision (pending in the ADR follow-up).
- **Delivery date.** Moving to `DELIVERED` sets `actual_delivery_date`.
- **User update.** Section 4.1 asks for querying and updating users; the contract only has status changes. Add `GET /users/{id}` and `PATCH /users/{id}` (name, role).
- **Key handling per environment.** Section 4.4 requires documenting how keys are configured in each environment: local generated files, CI-generated keys or GitHub Secrets, container environment variables.
- **Frontend views.** Login, dashboard, clients, engines, repair orders (list with filters, create), order detail with history and status update, and admin user management. Protected routes, logout on token expiry, validated forms, loading and error states.
- **Database initialization.** Init script that creates both databases and service users, Alembic migrations for business, migrations for auth, and the admin bootstrap script.
- **Docker Compose** for PostgreSQL, both APIs, and the frontend.
- **CI/CD.** GitHub Actions on pull requests and pushes to `main`: lint/type check, tests and build per component. Nice to have: build Docker images.
- **Evidence.** Screenshots or links to a green pipeline and test runs.

## 3. Testing strategy

- Auth: unit tests for services and endpoint tests (Supertest), including role checks and inactive users.
- Business: use case tests with in-memory repositories (no database) and API tests with `TestClient`, including JWT rejection cases, duplicate validation (409), and invalid transitions.
- Frontend: type check, build, and a few component tests.

## 4. Milestones

- [x] Architecture, data model, API contract, and ADRs.
- [ ] Close the gaps listed in section 2 in the documentation.
- [ ] Confirm local tools and versions: Git, Node.js/npm, Python/UV, Docker.
- [ ] Initialize the three projects.
- [ ] Database init script, migrations, admin bootstrap, and health checks.
- [ ] Auth API and tests.
- [ ] Business API and tests.
- [ ] Frontend integrated end to end.
- [ ] Docker Compose.
- [ ] GitHub Actions pipeline and evidence of a green run.
- [ ] README (install, configure, run, test) and final technical documentation.
