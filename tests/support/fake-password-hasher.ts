import type { PasswordHasher } from "../../src/application/ports/password-hasher";

/** Fast deterministic hasher so unit tests do not pay Argon2's cost. */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string) {
    return `hashed:${plain}`;
  }

  async verify(hash: string, plain: string) {
    return hash === `hashed:${plain}`;
  }
}
