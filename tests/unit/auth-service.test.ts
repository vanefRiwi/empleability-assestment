import { beforeEach, describe, expect, it } from "vitest";
import { AuthService } from "../../src/application/services/auth-service";
import { UserService } from "../../src/application/services/user-service";
import { InvalidCredentialsError } from "../../src/domain/errors";
import { JwtTokenService } from "../../src/infrastructure/security/jwt-token-service";
import { FakePasswordHasher } from "../support/fake-password-hasher";
import { InMemoryUserRepository } from "../support/in-memory-user-repository";
import { testJwtSettings } from "../support/test-app";

describe("AuthService", () => {
  let users: InMemoryUserRepository;
  let userService: UserService;
  let tokens: JwtTokenService;
  let auth: AuthService;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    const hasher = new FakePasswordHasher();
    userService = new UserService(users, hasher);
    tokens = new JwtTokenService(testJwtSettings);
    auth = new AuthService(users, hasher, tokens);
    await userService.create({ name: "Op", email: "op@example.com", password: "secret-123", role: "OPERATOR" });
  });

  it("issues a token whose claims identify the user and role", async () => {
    const issued = await auth.login(" OP@example.com ", "secret-123");
    const claims = tokens.verify(issued.accessToken);

    expect(issued.expiresIn).toBe(900);
    expect(claims).toEqual({ sub: users.users[0].id, role: "OPERATOR" });
  });

  it("rejects a wrong password and an unknown email with the same error", async () => {
    await expect(auth.login("op@example.com", "wrong")).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(auth.login("nobody@example.com", "secret-123")).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects inactive users", async () => {
    users.users[0].isActive = false;
    await expect(auth.login("op@example.com", "secret-123")).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
