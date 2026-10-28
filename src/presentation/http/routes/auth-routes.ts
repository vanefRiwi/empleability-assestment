import { Router } from "express";
import type { TokenService } from "../../../application/ports/token-service";
import type { AuthService } from "../../../application/services/auth-service";
import { authenticate } from "../middlewares/authenticate";
import { loginSchema, toUserResponse } from "../schemas/user-schemas";

export function authRoutes(authService: AuthService, tokens: TokenService): Router {
  const router = Router();

  router.post("/login", async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const token = await authService.login(email, password);
    res.status(200).json({ access_token: token.accessToken, token_type: "Bearer", expires_in: token.expiresIn });
  });

  router.get("/me", authenticate(tokens), async (req, res) => {
    const user = await authService.getCurrentUser(req.auth!.userId);
    res.json(toUserResponse(user));
  });

  return router;
}
