/**
 * Minimal forward-only migration runner.
 * Applies every `*.sql` file in ./migrations once, in name order, each in its own transaction.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";
import { loadConfig } from "../../config/env";
import { createPool } from "./pool";

const MIGRATIONS_DIR = join(__dirname, "migrations");

export async function runMigrations(pool: Pool): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.name));
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && !applied.has(file))
    .sort();

  for (const file of pending) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  return pending;
}

if (require.main === module) {
  const pool = createPool(loadConfig().databaseUrl);
  runMigrations(pool)
    .then((applied) => console.log(applied.length ? `Applied: ${applied.join(", ")}` : "No pending migrations."))
    .catch((error) => {
      console.error("Migration failed:", error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
