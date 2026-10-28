import { BusinessRuleError, ConflictError, NotFoundError } from "../../domain/errors";
import { normalizeEmail, toPublicUser, type PublicUser, type Role, type User } from "../../domain/user";
import type { PasswordHasher } from "../ports/password-hasher";
import type { UserChanges, UserRepository } from "../ports/user-repository";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
}

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async create(input: CreateUserInput): Promise<PublicUser> {
    const email = normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) {
      throw new ConflictError("A user with this email already exists.");
    }

    const user = await this.users.create({
      name: input.name.trim(),
      email,
      passwordHash: await this.hasher.hash(input.password),
      role: input.role,
    });
    return toPublicUser(user);
  }

  async list(): Promise<PublicUser[]> {
    const users = await this.users.list();
    return users.map(toPublicUser);
  }

  async getById(id: string): Promise<PublicUser> {
    return toPublicUser(await this.findOrFail(id));
  }

  async update(actorId: string, id: string, input: UpdateUserInput): Promise<PublicUser> {
    const user = await this.findOrFail(id);
    const changes: UserChanges = {};

    if (input.name !== undefined) changes.name = input.name.trim();
    if (input.role !== undefined && input.role !== user.role) {
      if (actorId === user.id) {
        throw new BusinessRuleError("You cannot change your own role.");
      }
      if (user.role === "ADMIN") await this.ensureNotLastAdmin(user, "change the role of");
      changes.role = input.role;
    }

    return toPublicUser(await this.applyChanges(id, changes));
  }

  async setStatus(actorId: string, id: string, isActive: boolean): Promise<PublicUser> {
    const user = await this.findOrFail(id);

    if (!isActive && user.isActive) {
      if (actorId === user.id) {
        throw new BusinessRuleError("You cannot deactivate your own account.");
      }
      if (user.role === "ADMIN") await this.ensureNotLastAdmin(user, "deactivate");
    }

    return toPublicUser(await this.applyChanges(id, { isActive }));
  }

  private async ensureNotLastAdmin(user: User, action: string): Promise<void> {
    if (user.isActive && (await this.users.countActiveAdmins()) <= 1) {
      throw new BusinessRuleError(`You cannot ${action} the last active administrator.`);
    }
  }

  private async applyChanges(id: string, changes: UserChanges): Promise<User> {
    if (Object.keys(changes).length === 0) return this.findOrFail(id);
    const updated = await this.users.update(id, changes);
    if (!updated) throw new NotFoundError("User not found.");
    return updated;
  }

  private async findOrFail(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError("User not found.");
    return user;
  }
}
