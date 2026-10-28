# API Contract: Express Authentication and FastAPI Business Services

## 1. Scope and conventions

This document defines the initial contract between the React frontend, Express authentication service, and FastAPI business service. It is a design specification, not application code.

- API prefix: `/api/v1`.
- JSON request/response bodies unless otherwise stated.
- Timestamps use ISO 8601 with a timezone and are normalized to UTC.
- UUIDs are represented as strings.
- Express owns `/auth/*` and `/users/*`; FastAPI owns business endpoints.
- Error responses use `application/problem+json`, aligned with RFC 9457.

## 2. JWT access-token contract

### Signing and verification

- Algorithm: **RS256**.
- Express holds the private signing key and issues access tokens.
- FastAPI holds the corresponding public verification key(s) only.
- JWT header includes `kid` to identify the signing key.
- FastAPI explicitly allows RS256 and validates signature and claims; decoding alone is not authentication.
- Access-token lifetime: **15 minutes (900 seconds)**.
- Refresh tokens are outside the initial scope; users sign in again after expiration.
- Secrets and private keys must be provided through environment-specific secret management and never committed to Git.

### Required claims

| Claim | Value / meaning |
|---|---|
| `iss` | `engine-repair-auth` |
| `aud` | `engine-repair-api` |
| `sub` | Authenticated user's UUID |
| `role` | `ADMIN` or `OPERATOR` |
| `iat` | Issued-at time |
| `exp` | Expiration time |
| `jti` | Unique token identifier |

The token is signed, not encrypted. Do not include passwords, password hashes, private data, or secrets in claims. FastAPI validates the algorithm, signature, issuer, audience, expiration, a valid UUID in `sub`, and an allowed role. Key rotation must retain old public keys until tokens signed with them can no longer be valid.

A disabled user's token may remain cryptographically valid until expiration. Immediate revocation would require a revocation or active-user verification mechanism and is outside this initial stateless-token contract.

### Login response example

HTTP `200 OK`:

```json
{
  "access_token": "<signed-jwt>",
  "token_type": "Bearer",
  "expires_in": 900
}
```

Protected requests send:

```http
Authorization: Bearer <signed-jwt>
```

## 3. Roles and authorization

| Capability | ADMIN | OPERATOR | Unauthenticated |
|---|---:|---:|---:|
| Create user account | Yes | No | No |
| List users | Yes | No | No |
| Read current user's profile | Yes | Yes | No |
| Change a user's active status | Yes | No | No |
| Read business health endpoint | Yes | Yes | Yes |
| Create/read clients | Yes | Yes | No |
| Create/read engines | Yes | Yes | No |
| Create/read repair orders | Yes | Yes | No |
| Change repair-order status | Yes | Yes | No |
| Read repair-order status history | Yes | Yes | No |

Rules:
- Backend APIs enforce authorization; frontend navigation is not a security boundary.
- Public self-registration is disabled in the initial scope.
- Only an authenticated `ADMIN` may create user accounts. The server validates the requested role against `ADMIN` and `OPERATOR`; an operator cannot create users or elevate privileges.
- The first administrator is provisioned through a controlled bootstrap procedure, not a public endpoint.
- Health output must not expose secrets, configuration values, or internal infrastructure details.
- If assessment requirements demand more restrictive permissions, update this matrix before implementation.

## 4. Express authentication endpoints

### `POST /api/v1/users`

Create a user account. Requires an authenticated `ADMIN` token. Public self-registration is not available in the initial scope.

Request:
```json
{
  "name": "Example Operator",
  "email": "operator@example.com",
  "password": "<provided-by-admin>",
  "role": "OPERATOR"
}
```

The service validates the requested role (`ADMIN` or `OPERATOR`), normalizes the email, hashes the password, and never returns the password or hash. Return `201 Created` on success, `401 Unauthorized` for missing/invalid authentication, `403 Forbidden` for a non-admin caller, `409 Conflict` if the normalized email already exists, and `422 Unprocessable Content` for invalid fields. The first administrator is created through a controlled bootstrap procedure outside this endpoint.

### `POST /api/v1/auth/login`

Request:
```json
{
  "email": "operator@example.com",
  "password": "<provided-by-user>"
}
```

Success: `200 OK` with the access-token response above. Invalid credentials return a generic `401 Unauthorized` response that does not reveal whether the email exists.

### `GET /api/v1/auth/me`

Requires a valid Bearer access token. Example response:
```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "name": "Example Operator",
  "email": "operator@example.com",
  "role": "OPERATOR",
  "is_active": true
}
```

Never return `password_hash`.

### `GET /api/v1/users`

Requires `ADMIN`. Returns public user fields only; never return password hashes or credential material.

### `PATCH /api/v1/users/{user_id}/status`

Requires `ADMIN`.

Request:
```json
{ "is_active": false }
```

Returns `200 OK` with public user fields after the update. Consider safeguards against self-deactivation or deactivation of the last active administrator; settle exact behavior before implementation.

## 5. FastAPI business endpoints

All endpoints are under `/api/v1`. Except for health, all require a valid Bearer access token and an authorized role from section 3.

| Method | Endpoint | Permission | Purpose | Success |
|---|---|---|---|---|
| GET | `/health` | Public | Basic health status only | 200 |
| POST | `/clients` | ADMIN, OPERATOR | Create client | 201 |
| GET | `/clients` | ADMIN, OPERATOR | List clients | 200 |
| GET | `/clients/{client_id}` | ADMIN, OPERATOR | Get client | 200 |
| POST | `/engines` | ADMIN, OPERATOR | Register engine | 201 |
| GET | `/engines` | ADMIN, OPERATOR | List engines | 200 |
| GET | `/engines/{engine_id}` | ADMIN, OPERATOR | Get engine | 200 |
| POST | `/repair-orders` | ADMIN, OPERATOR | Create order and initial history row | 201 |
| GET | `/repair-orders` | ADMIN, OPERATOR | List repair orders | 200 |
| GET | `/repair-orders/{order_id}` | ADMIN, OPERATOR | Get repair order | 200 |
| PATCH | `/repair-orders/{order_id}/status` | ADMIN, OPERATOR | Perform a valid status transition | 200 |
| GET | `/repair-orders/{order_id}/history` | ADMIN, OPERATOR | Read chronological status history | 200 |

Pagination/filtering may be added consistently when the list endpoint schemas are finalized.

### Representative business request payloads

Create client:
```json
{
  "name": "Example Client",
  "document_type": "CC",
  "document_number": "123456789",
  "email": "client@example.com",
  "phone": "+57 300 000 0000"
}
```

Create engine:
```json
{
  "serial_number": "ENG-000123",
  "manufacturer": "Example Manufacturer",
  "model": "X100",
  "engine_type": "Diesel",
  "capacity": "2.0 L",
  "client_id": "00000000-0000-4000-8000-000000000002"
}
```

Create repair order:
```json
{
  "engine_id": "00000000-0000-4000-8000-000000000003",
  "client_id": "00000000-0000-4000-8000-000000000002",
  "received_at": "2026-10-27T14:30:00Z",
  "reported_problem": "Engine does not start",
  "observations": "Received for initial inspection"
}
```

The server generates `id`, `order_number`, initial status, and audit timestamps. The initial status is `RECEIVED`; creating the order and its first history record is one transaction. The engine/client pair must satisfy the ownership integrity rule in `docs/data-model.md`.

Approval state is part of the repair-order resource. The initial scope does not expose a separate approval-history endpoint; the business service must validate and persist approval changes consistently. The exact route and request schema for recording a client decision should be finalized alongside implementation, without bypassing the approval gate.

Change status:
```json
{
  "status": "IN_DIAGNOSIS",
  "observations": "Initial inspection started"
}
```

The business use case validates the transition, updates the order's current status, and inserts a history row atomically. Invalid transitions are rejected. Approval is stored on `repair_orders` using `approval_status`, `approved_at`, and `approval_notes`. When approval is required, set `approval_status` to `PENDING`; only `APPROVED` permits transition from `AWAITING_APPROVAL` to `IN_REPAIR`. `NOT_REQUIRED` is reserved for orders that do not require client approval.

Example repair-order response:
```json
{
  "id": "00000000-0000-4000-8000-000000000004",
  "order_number": "REP-2026-000001",
  "engine_id": "00000000-0000-4000-8000-000000000003",
  "client_id": "00000000-0000-4000-8000-000000000002",
  "status": "RECEIVED",
  "received_at": "2026-10-27T14:30:00Z",
  "reported_problem": "Engine does not start"
}
```

Payloads are illustrative. Exact response schemas and pagination fields must be finalized before endpoint implementation. The repair-order create/response schemas should expose `approval_status`, `approved_at`, and `approval_notes` where appropriate.

## 6. HTTP status codes

| Code | Meaning / use |
|---|---|
| 200 | Successful read, login, or update |
| 201 | Resource created |
| 400 | Invalid request or invalid business transition |
| 401 | Missing, malformed, invalid, or expired authentication; invalid login |
| 403 | Authenticated caller lacks permission |
| 404 | Resource does not exist |
| 409 | Uniqueness or state conflict |
| 422 | Request schema/field validation failure, when used consistently |
| 500 | Unexpected server error; never disclose stack traces or secrets |

## 7. Error format

Use `application/problem+json`, aligned with RFC 9457. Example:
```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "A client with this document already exists.",
  "instance": "/api/v1/clients"
}
```

Validation responses may include a documented extension with field-level issues, but must not include secrets, SQL text, stack traces, or internal exception details.

## 8. Cross-service boundary

- Express is authoritative for user identity, credentials, roles, and token issuance.
- FastAPI trusts only tokens that pass the specified cryptographic and claim checks.
- FastAPI does not query Express's database or private users table.
- No cross-database foreign keys are used.
- The frontend calls each API through its documented responsibility boundary.
- Changes to claims, role names, endpoint paths, payloads, or error formats must be reflected here and covered by tests before implementation/release.
