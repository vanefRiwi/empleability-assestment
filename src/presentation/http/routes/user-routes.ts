import { Router } from "express";
import type { TokenService } from "../../../application/ports/token-service";
import type { UserService } from "../../../application/services/user-service";
import { authenticate, requireRole } from "../middlewares/authenticate";
import {
  createUserSchema,
  toUserResponse,
  updateStatusSchema,
  updateUserSchema,
  userIdParamSchema,
} from "../schemas/user-schemas";

export function userRoutes(userService: UserService, tokens: TokenService): Router {
  const router = Router();
  router.use(authenticate(tokens), requireRole("ADMIN"));

  router.post("/", async (req, res) => {
    const user = await userService.create(createUserSchema.parse(req.body));
    res.status(201).location(`${req.baseUrl}/${user.id}`).json(toUserResponse(user));
  });

  router.get("/", async (_req, res) => {
    const users = await userService.list();
    res.json(users.map(toUserResponse));
  });

  router.get("/:userId", async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    res.json(toUserResponse(await userService.getById(userId)));
  });

  router.patch("/:userId", async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const user = await userService.update(req.auth!.userId, userId, updateUserSchema.parse(req.body));
    res.json(toUserResponse(user));
  });

  router.patch("/:userId/status", async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const { is_active } = updateStatusSchema.parse(req.body);
    const user = await userService.setStatus(req.auth!.userId, userId, is_active);
    res.json(toUserResponse(user));
  });

  return router;
}
