import type { Role, User } from "../../domain/user";

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export interface UserChanges {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(): Promise<User[]>;
  create(user: NewUser): Promise<User>;
  update(id: string, changes: UserChanges): Promise<User | null>;
  countActiveAdmins(): Promise<number>;
}
