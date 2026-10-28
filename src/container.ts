import type { Pool } from "pg";
import { AuthService } from "./application/services/auth-service";
import { UserService } from "./application/services/user-service";
import type { AppConfig } from "./config/env";
import { createPool } from "./infrastructure/database/pool";
import { PostgresUserRepository } from "./infrastructure/repositories/postgres-user-repository";
import { Argon2PasswordHasher } from "./infrastructure/security/argon2-password-hasher";
import { JwtTokenService } from "./infrastructure/security/jwt-token-service";
import type { AppDependencies } from "./presentation/http/app";

/** Composition root: the only place that picks concrete implementations. */
export function buildContainer(config: AppConfig): AppDependencies & { pool: Pool; userService: UserService } {
  const pool = createPool(config.databaseUrl);
  const users = new PostgresUserRepository(pool);
  const hasher = new Argon2PasswordHasher();
  const tokenService = new JwtTokenService(config.jwt);

  return {
    pool,
    tokenService,
    authService: new AuthService(users, hasher, tokenService),
    userService: new UserService(users, hasher),
    corsOrigins: config.corsOrigins,
  };
}
