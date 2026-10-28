/**
 * Controlled bootstrap of the first administrator (ADR-002).
 * Creates the admin only when no active administrator exists; otherwise it does nothing.
 */
import { z } from "zod";
import { loadConfig } from "../config/env";
import { buildContainer } from "../container";
import { PostgresUserRepository } from "../infrastructure/repositories/postgres-user-repository";

const bootstrapSchema = z.object({
  BOOTSTRAP_ADMIN_NAME: z.string().trim().min(2).default("Administrator"),
  BOOTSTRAP_ADMIN_EMAIL: z.email(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12, "Use at least 12 characters for the admin password"),
});

async function main(): Promise<void> {
  const input = bootstrapSchema.parse(process.env);
  const container = buildContainer(loadConfig());

  try {
    const activeAdmins = await new PostgresUserRepository(container.pool).countActiveAdmins();
    if (activeAdmins > 0) {
      console.log("An active administrator already exists. Nothing to do.");
      return;
    }
    const admin = await container.userService.create({
      name: input.BOOTSTRAP_ADMIN_NAME,
      email: input.BOOTSTRAP_ADMIN_EMAIL,
      password: input.BOOTSTRAP_ADMIN_PASSWORD,
      role: "ADMIN",
    });
    console.log(`Administrator created: ${admin.email}`);
  } finally {
    await container.pool.end();
  }
}

main().catch((error) => {
  console.error("Admin bootstrap failed:", error.message);
  process.exitCode = 1;
});
