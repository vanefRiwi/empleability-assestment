import { randomUUID } from "node:crypto";
import type { NewUser, UserChanges, UserRepository } from "../../src/application/ports/user-repository";
import type { User } from "../../src/domain/user";

export class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];

  async findById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async list() {
    return [...this.users];
  }

  async create(input: NewUser) {
    const now = new Date();
    const user: User = { id: randomUUID(), ...input, isActive: true, createdAt: now, updatedAt: now };
    this.users.push(user);
    return user;
  }

  async update(id: string, changes: UserChanges) {
    const user = await this.findById(id);
    if (!user) return null;
    Object.assign(user, changes, { updatedAt: new Date() });
    return user;
  }

  async countActiveAdmins() {
    return this.users.filter((user) => user.role === "ADMIN" && user.isActive).length;
  }
}
