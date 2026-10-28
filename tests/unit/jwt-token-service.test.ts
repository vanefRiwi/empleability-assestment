import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { UnauthorizedError } from "../../src/domain/errors";
import { JwtTokenService } from "../../src/infrastructure/security/jwt-token-service";
import { generatePrivateKey, testJwtSettings } from "../support/test-app";

const userId = "00000000-0000-4000-8000-000000000001";

describe("JwtTokenService", () => {
  const service = new JwtTokenService(testJwtSettings);

  it("signs RS256 tokens with kid, iss, aud, sub, role, iat, exp and jti", () => {
    const { accessToken } = service.issue({ sub: userId, role: "ADMIN" });
    const decoded = jwt.decode(accessToken, { complete: true })!;
    const payload = decoded.payload as jwt.JwtPayload;

    expect(decoded.header).toMatchObject({ alg: "RS256", kid: "test-key" });
    expect(payload).toMatchObject({ iss: "engine-repair-auth", aud: "engine-repair-api", sub: userId, role: "ADMIN" });
    expect(payload.exp! - payload.iat!).toBe(900);
    expect(payload.jti).toEqual(expect.any(String));
  });

  it("rejects tokens signed with another key", () => {
    const other = new JwtTokenService({ ...testJwtSettings, privateKey: generatePrivateKey() });
    const { accessToken } = other.issue({ sub: userId, role: "ADMIN" });
    expect(() => service.verify(accessToken)).toThrow(UnauthorizedError);
  });

  it("rejects expired tokens", () => {
    const token = jwt.sign({ role: "ADMIN", exp: Math.floor(Date.now() / 1000) - 10 }, testJwtSettings.privateKey, {
      algorithm: "RS256",
      issuer: testJwtSettings.issuer,
      audience: testJwtSettings.audience,
      subject: userId,
    });
    expect(() => service.verify(token)).toThrow(UnauthorizedError);
  });

  it("rejects signed tokens that omit required expiration and token ID claims", () => {
    const token = jwt.sign(
      { role: "ADMIN" },
      testJwtSettings.privateKey,
      {
        algorithm: "RS256",
        issuer: testJwtSettings.issuer,
        audience: testJwtSettings.audience,
        subject: userId,
      },
    );
    expect(() => service.verify(token)).toThrow(UnauthorizedError);
  });

  it("rejects a wrong audience and unsigned tokens", () => {
    const wrongAudience = new JwtTokenService({ ...testJwtSettings, audience: "other-api" });
    expect(() => service.verify(wrongAudience.issue({ sub: userId, role: "ADMIN" }).accessToken)).toThrow(
      UnauthorizedError,
    );

    const unsigned = jwt.sign({ role: "ADMIN", sub: userId }, "", { algorithm: "none" });
    expect(() => service.verify(unsigned)).toThrow(UnauthorizedError);
  });
});
