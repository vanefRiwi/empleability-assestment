import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    AUTH_PORT: z.coerce.number().int().positive().default(3001),
    AUTH_DATABASE_URL: z.string().min(1),
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PRIVATE_KEY_PATH: z.string().optional(),
    JWT_KEY_ID: z.string().min(1),
    JWT_ISSUER: z.string().min(1).default("engine-repair-auth"),
    JWT_AUDIENCE: z.string().min(1).default("engine-repair-api"),
    JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(900),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),
  })
  .refine((env) => Boolean(env.JWT_PRIVATE_KEY) !== Boolean(env.JWT_PRIVATE_KEY_PATH), {
    message: "Set exactly one of JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH",
    path: ["JWT_PRIVATE_KEY"],
  });

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  jwt: {
    privateKey: string;
    keyId: string;
    issuer: string;
    audience: string;
    expiresInSeconds: number;
  };
  corsOrigins: string[];
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
  }
  const env = parsed.data;

  // Keys passed through env vars often have escaped newlines.
  const privateKey = env.JWT_PRIVATE_KEY
    ? env.JWT_PRIVATE_KEY.replace(/\\n/g, "\n")
    : readFileSync(resolve(env.JWT_PRIVATE_KEY_PATH as string), "utf8");

  return {
    nodeEnv: env.NODE_ENV,
    port: env.AUTH_PORT,
    databaseUrl: env.AUTH_DATABASE_URL,
    jwt: {
      privateKey,
      keyId: env.JWT_KEY_ID,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
    },
    corsOrigins: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
  };
}
