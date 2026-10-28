import { z } from "zod";
import { ROLES, type PublicUser } from "../../../domain/user";

const name = z.string().trim().min(2).max(120);
const email = z.email().max(254);
const password = z.string().min(8).max(128);
const role = z.enum(ROLES);

// Reject unexpected properties consistently instead of silently accepting
// client-supplied fields such as id, is_active, or password_hash.
export const loginSchema = z
  .object({
    email,
    password: z.string().min(1).max(128),
  })
  .strict();

export const createUserSchema = z.object({ name, email, password, role }).strict();

export const updateUserSchema = z
  .object({ name: name.optional(), role: role.optional() })
  .strict()
  .refine((body) => body.name !== undefined || body.role !== undefined, {
    message: "Provide at least one of: name, role",
  });

export const updateStatusSchema = z.object({ is_active: z.boolean() }).strict();

export const userIdParamSchema = z.object({ userId: z.uuid() });

/** API representation: snake_case and never any credential material. */
export function toUserResponse(user: PublicUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.isActive,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}
