import type { RequestHandler } from "express";
import type { TokenService } from "../../../application/ports/token-service";
import { ForbiddenError, UnauthorizedError } from "../../../domain/errors";
import type { Role } from "../../../domain/user";

declare module "express-serve-static-core" {
  interface Request {
    auth?: { userId: string; role: Role };
  }
}

export function authenticate(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedError("A Bearer access token is required.");
    }
    const claims = tokens.verify(token);
    req.auth = { userId: claims.sub, role: claims.role };
    next();
  };
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw new UnauthorizedError();
    if (!roles.includes(req.auth.role)) throw new ForbiddenError();
    next();
  };
}
