import { readFileSync } from "node:fs";
import { join } from "node:path";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { parse as parseYaml } from "yaml";
import type { TokenService } from "../../application/ports/token-service";
import type { AuthService } from "../../application/services/auth-service";
import type { UserService } from "../../application/services/user-service";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { authRoutes } from "./routes/auth-routes";
import { userRoutes } from "./routes/user-routes";

export interface AppDependencies {
  authService: AuthService;
  userService: UserService;
  tokenService: TokenService;
  corsOrigins: string[];
}

const openApiDocument = parseYaml(readFileSync(join(__dirname, "docs", "openapi.yaml"), "utf8"));

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: deps.corsOrigins }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use("/api/v1/auth", authRoutes(deps.authService, deps.tokenService));
  app.use("/api/v1/users", userRoutes(deps.userService, deps.tokenService));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
