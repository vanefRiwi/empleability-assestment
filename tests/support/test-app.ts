import { generateKeyPairSync } from "node:crypto";
import { AuthService } from "../../src/application/services/auth-service";
import { UserService } from "../../src/application/services/user-service";
import { JwtTokenService, type JwtSettings } from "../../src/infrastructure/security/jwt-token-service";
import { createApp } from "../../src/presentation/http/app";
import { FakePasswordHasher } from "./fake-password-hasher";
import { InMemoryUserRepository } from "./in-memory-user-repository";

export function generatePrivateKey(): string {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  }).privateKey;
}

export const testJwtSettings: JwtSettings = {
  privateKey: generatePrivateKey(),
  keyId: "test-key",
  issuer: "engine-repair-auth",
  audience: "engine-repair-api",
  expiresInSeconds: 900,
};

export function buildTestApp() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const tokenService = new JwtTokenService(testJwtSettings);
  const userService = new UserService(users, hasher);
  const app = createApp({
    authService: new AuthService(users, hasher, tokenService),
    userService,
    tokenService,
    corsOrigins: [],
  });
  return { app, users, userService, tokenService };
}
