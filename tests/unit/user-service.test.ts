import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "../../src/application/services/user-service";
import { BusinessRuleError, ConflictError, NotFoundError } from "../../src/domain/errors";
import { FakePasswordHasher } from "../support/fake-password-hasher";
import { InMemoryUserRepository } from "../support/in-memory-user-repository";

describe("UserService", () => {
  let users: InMemoryUserRepository;
  let service: UserService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new UserService(users, new FakePasswordHasher());
  });

  const createAdmin = () =>
    service.create({ name: "Admin", email: "admin@example.com", password: "secret-123", role: "ADMIN" });

  it("normalizes the email, hashes the password and never exposes the hash", async () => {
    const user = await service.create({
      name: "  Ana  ",
      email: "  Ana@Example.COM ",
      password: "secret-123",
      role: "OPERATOR",
    });

    expect(user.email).toBe("ana@example.com");
    expect(user.name).toBe("Ana");
    expect(user).not.toHaveProperty("passwordHash");
    expect(users.users[0].passwordHash).toBe("hashed:secret-123");
  });

  it("rejects a duplicate email regardless of case", async () => {
    await createAdmin();
    await expect(
      service.create({ name: "Other", email: "ADMIN@example.com", password: "secret-123", role: "OPERATOR" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("prevents an admin from deactivating their own account", async () => {
    const admin = await createAdmin();
    await expect(service.setStatus(admin.id, admin.id, false)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it("prevents deactivating or demoting the last active admin", async () => {
    const admin = await createAdmin();
    const other = await service.create({ name: "Op", email: "op@example.com", password: "secret-123", role: "OPERATOR" });

    await expect(service.setStatus(other.id, admin.id, false)).rejects.toBeInstanceOf(BusinessRuleError);
    await expect(service.update(other.id, admin.id, { role: "OPERATOR" })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it("allows deactivating an admin when another active admin remains", async () => {
    const first = await createAdmin();
    const second = await service.create({ name: "Admin 2", email: "a2@example.com", password: "secret-123", role: "ADMIN" });

    const updated = await service.setStatus(first.id, second.id, false);
    expect(updated.isActive).toBe(false);
  });

  it("prevents an admin from changing their own role", async () => {
    const admin = await createAdmin();
    await service.create({ name: "Admin 2", email: "a2@example.com", password: "secret-123", role: "ADMIN" });
    await expect(service.update(admin.id, admin.id, { role: "OPERATOR" })).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it("throws NotFoundError for unknown users", async () => {
    await expect(service.getById("00000000-0000-4000-8000-000000000000")).rejects.toBeInstanceOf(NotFoundError);
  });
});
