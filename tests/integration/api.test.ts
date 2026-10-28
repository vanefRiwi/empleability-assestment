import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../support/test-app";

describe("auth-service HTTP API", () => {
  let ctx: ReturnType<typeof buildTestApp>;
  let adminToken: string;
  let operatorToken: string;

  const login = async (email: string, password: string) => {
    const res = await request(ctx.app).post("/api/v1/auth/login").send({ email, password });
    return res.body.access_token as string;
  };

  beforeEach(async () => {
    ctx = buildTestApp();
    await ctx.userService.create({ name: "Admin", email: "admin@example.com", password: "admin-pass-1", role: "ADMIN" });
    await ctx.userService.create({ name: "Op", email: "op@example.com", password: "op-pass-123", role: "OPERATOR" });
    adminToken = await login("admin@example.com", "admin-pass-1");
    operatorToken = await login("op@example.com", "op-pass-123");
  });

  describe("POST /api/v1/auth/login", () => {
    it("returns a Bearer token", async () => {
      const res = await request(ctx.app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@example.com", password: "admin-pass-1" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ access_token: expect.any(String), token_type: "Bearer", expires_in: 900 });
    });

    it("returns a generic 401 problem for bad credentials", async () => {
      const res = await request(ctx.app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@example.com", password: "nope" });

      expect(res.status).toBe(401);
      expect(res.headers["content-type"]).toContain("application/problem+json");
      expect(res.body).toMatchObject({ status: 401, title: "Unauthorized", instance: "/api/v1/auth/login" });
    });

    it("returns 422 with field issues for invalid input", async () => {
      const res = await request(ctx.app).post("/api/v1/auth/login").send({ email: "not-an-email" });

      expect(res.status).toBe(422);
      expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(
        expect.arrayContaining(["email", "password"]),
      );
    });

    it("rejects unexpected login fields", async () => {
      const res = await request(ctx.app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@example.com", password: "admin-pass-1", role: "ADMIN" });
      expect(res.status).toBe(422);
    });

    it("returns 400 for malformed JSON", async () => {
      const res = await request(ctx.app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/json")
        .send("{bad json");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns the current user without the password hash", async () => {
      const res = await request(ctx.app).get("/api/v1/auth/me").set("Authorization", `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: "op@example.com", role: "OPERATOR", is_active: true });
      expect(JSON.stringify(res.body)).not.toContain("hashed:");
    });

    it("requires a valid token", async () => {
      expect((await request(ctx.app).get("/api/v1/auth/me")).status).toBe(401);
      const res = await request(ctx.app).get("/api/v1/auth/me").set("Authorization", "Bearer tampered.token.value");
      expect(res.status).toBe(401);
    });
  });

  describe("/api/v1/users", () => {
    it("rejects unexpected fields when creating a user", async () => {
      const res = await request(ctx.app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Unexpected", email: "unexpected@example.com", password: "new-pass-123", role: "OPERATOR", is_active: true });
      expect(res.status).toBe(422);
    });

    it("lets an admin create a user and rejects duplicates", async () => {
      const body = { name: "New Op", email: "new@example.com", password: "new-pass-123", role: "OPERATOR" };

      const created = await request(ctx.app).post("/api/v1/users").set("Authorization", `Bearer ${adminToken}`).send(body);
      expect(created.status).toBe(201);
      expect(created.headers.location).toBe(`/api/v1/users/${created.body.id}`);
      expect(created.body).not.toHaveProperty("password");

      const duplicate = await request(ctx.app).post("/api/v1/users").set("Authorization", `Bearer ${adminToken}`).send(body);
      expect(duplicate.status).toBe(409);
    });

    it("forbids operators and anonymous callers", async () => {
      const operator = await request(ctx.app).get("/api/v1/users").set("Authorization", `Bearer ${operatorToken}`);
      expect(operator.status).toBe(403);
      expect((await request(ctx.app).get("/api/v1/users")).status).toBe(401);
    });

    it("rejects roles outside ADMIN and OPERATOR", async () => {
      const res = await request(ctx.app)
        .post("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "X", email: "x@example.com", password: "x-pass-1234", role: "ROOT" });
      expect(res.status).toBe(422);
    });

    it("lists, reads and updates users", async () => {
      const list = await request(ctx.app).get("/api/v1/users").set("Authorization", `Bearer ${adminToken}`);
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(2);

      const operator = list.body.find((u: { role: string }) => u.role === "OPERATOR");
      const updated = await request(ctx.app)
        .patch(`/api/v1/users/${operator.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Renamed" });
      expect(updated.status).toBe(200);
      expect(updated.body.name).toBe("Renamed");

      const missing = await request(ctx.app)
        .get("/api/v1/users/00000000-0000-4000-8000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(missing.status).toBe(404);
    });

    it("deactivates a user, who can then no longer sign in", async () => {
      const operator = ctx.users.users.find((u) => u.role === "OPERATOR")!;
      const res = await request(ctx.app)
        .patch(`/api/v1/users/${operator.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ is_active: false });

      expect(res.status).toBe(200);
      expect(res.body.is_active).toBe(false);
      const loginRes = await request(ctx.app)
        .post("/api/v1/auth/login")
        .send({ email: "op@example.com", password: "op-pass-123" });
      expect(loginRes.status).toBe(401);
    });

    it("blocks an admin from deactivating themselves", async () => {
      const admin = ctx.users.users.find((u) => u.role === "ADMIN")!;
      const res = await request(ctx.app)
        .patch(`/api/v1/users/${admin.id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ is_active: false });
      expect(res.status).toBe(400);
    });

    it("validates the user id format", async () => {
      const res = await request(ctx.app).get("/api/v1/users/not-a-uuid").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(422);
    });
  });

  it("returns a problem response for unknown routes and serves health", async () => {
    expect((await request(ctx.app).get("/nope")).status).toBe(404);
    expect((await request(ctx.app).get("/health")).body).toEqual({ status: "ok" });
  });
});
