import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { NewUser, UserChanges, UserRepository } from "../../application/ports/user-repository";
import { ConflictError } from "../../domain/errors";
import type { Role, User } from "../../domain/user";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = "id, name, email, password_hash, role, is_active, created_at, updated_at";
const UNIQUE_VIOLATION = "23505";

function toDomain(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [email]);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async list(): Promise<User[]> {
    const { rows } = await this.pool.query<UserRow>(`SELECT ${COLUMNS} FROM users ORDER BY created_at`);
    return rows.map(toDomain);
  }

  async create(user: NewUser): Promise<User> {
    try {
      const { rows } = await this.pool.query<UserRow>(
        `INSERT INTO users (id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [randomUUID(), user.name, user.email, user.passwordHash, user.role],
      );
      return toDomain(rows[0]);
    } catch (error) {
      // Covers the race where two requests pass the service-level check at once.
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictError("A user with this email already exists.");
      }
      throw error;
    }
  }

  async update(id: string, changes: UserChanges): Promise<User | null> {
    const columns: Record<keyof UserChanges, string> = { name: "name", role: "role", isActive: "is_active" };
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const key of Object.keys(columns) as (keyof UserChanges)[]) {
      if (changes[key] !== undefined) {
        values.push(changes[key]);
        sets.push(`${columns[key]} = $${values.length}`);
      }
    }
    values.push(id);

    const { rows } = await this.pool.query<UserRow>(
      `UPDATE users SET ${sets.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING ${COLUMNS}`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async countActiveAdmins(): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND is_active = TRUE",
    );
    return Number(rows[0].count);
  }
}
