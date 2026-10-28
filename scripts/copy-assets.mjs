// Copies non-TypeScript runtime assets (SQL migrations, OpenAPI spec) into dist.
import { cpSync } from "node:fs";

cpSync("src/infrastructure/database/migrations", "dist/infrastructure/database/migrations", { recursive: true });
cpSync("src/presentation/http/docs", "dist/presentation/http/docs", { recursive: true });
