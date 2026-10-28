# auth-service

Authentication and user administration API (Express + TypeScript). It owns the `users` table in the
authentication database, hashes passwords with Argon2id and issues RS256 access tokens that the
business service verifies with the public key.

## Structure

```text
src/
├── config/                 # Environment validation (zod)
├── domain/                 # User entity, roles, domain errors
├── application/
│   ├── ports/              # UserRepository, PasswordHasher, TokenService contracts
│   └── services/           # AuthService (login, me), UserService (admin operations)
├── infrastructure/
│   ├── database/           # pg pool, SQL migrations and runner
│   ├── repositories/       # PostgresUserRepository
│   └── security/           # Argon2 hasher, RS256 JWT service
├── presentation/http/      # Express app, routes, middlewares, request schemas, OpenAPI spec
├── scripts/                # Admin bootstrap
├── container.ts            # Composition root
└── server.ts               # Entry point
tests/
├── unit/                   # Services and JWT, with in-memory fakes
└── integration/            # HTTP API through supertest
```

Dependencies point inward: routes call services, services depend only on ports, and the
infrastructure implements those ports. Tests swap Postgres and Argon2 for in-memory fakes.

## Endpoints

Swagger UI: `http://localhost:3001/api/v1/docs`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Liveness check |
| POST | `/api/v1/auth/login` | Public | Sign in, returns `access_token` (15 min) |
| GET | `/api/v1/auth/me` | Authenticated | Current user profile |
| POST | `/api/v1/users` | ADMIN | Create user |
| GET | `/api/v1/users` | ADMIN | List users |
| GET | `/api/v1/users/{id}` | ADMIN | Get user |
| PATCH | `/api/v1/users/{id}` | ADMIN | Update name or role |
| PATCH | `/api/v1/users/{id}/status` | ADMIN | Activate or deactivate |

Errors use `application/problem+json` (RFC 9457). Business safeguards: an admin cannot deactivate
themselves or change their own role, and the last active admin cannot be deactivated or demoted.
Inactive users cannot sign in.

## Local setup

```bash
cd auth-service
npm install
cp .env.example .env          # adjust AUTH_DATABASE_URL
npm run keys:generate         # writes secrets/jwt-private.pem and jwt-public.pem (git-ignored)
npm run db:migrate            # creates the users table
npm run admin:bootstrap       # creates the first ADMIN from BOOTSTRAP_ADMIN_* (only if none exists)
npm run dev
```

The public key (`secrets/jwt-public.pem`) is the only file the business service needs.

## JWT keys per environment

- **Local:** `npm run keys:generate`, files referenced by `JWT_PRIVATE_KEY_PATH`.
- **CI:** tests generate a throwaway key pair in memory; no secret is required.
- **Containers / deployed:** pass the PEM through `JWT_PRIVATE_KEY` (secret manager, GitHub Secrets)
  or mount it as a file and set `JWT_PRIVATE_KEY_PATH`. Set `JWT_KEY_ID` so verifiers can pick the
  right public key during rotation.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with reload |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm test` | Unit and integration tests |
| `npm run lint` / `npm run typecheck` | Static checks |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run admin:bootstrap` | Create the first administrator |
