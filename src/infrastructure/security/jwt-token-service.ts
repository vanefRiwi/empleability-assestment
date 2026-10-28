import { createPublicKey, randomUUID, type KeyObject } from "node:crypto";
import jwt from "jsonwebtoken";
import type { AccessTokenClaims, IssuedToken, TokenService } from "../../application/ports/token-service";
import { UnauthorizedError } from "../../domain/errors";
import { ROLES, type Role } from "../../domain/user";

const ALGORITHM = "RS256";

export interface JwtSettings {
  privateKey: string;
  keyId: string;
  issuer: string;
  audience: string;
  expiresInSeconds: number;
}

export class JwtTokenService implements TokenService {
  private readonly publicKey: KeyObject;

  constructor(private readonly settings: JwtSettings) {
    // Express only needs the public half to verify its own tokens.
    this.publicKey = createPublicKey(settings.privateKey);
  }

  issue(claims: AccessTokenClaims): IssuedToken {
    const accessToken = jwt.sign({ role: claims.role }, this.settings.privateKey, {
      algorithm: ALGORITHM,
      keyid: this.settings.keyId,
      issuer: this.settings.issuer,
      audience: this.settings.audience,
      subject: claims.sub,
      expiresIn: this.settings.expiresInSeconds,
      jwtid: randomUUID(),
    });
    return { accessToken, expiresIn: this.settings.expiresInSeconds };
  }

  verify(token: string): AccessTokenClaims {
    let payload: jwt.JwtPayload | string;
    try {
      payload = jwt.verify(token, this.publicKey, {
        algorithms: [ALGORITHM],
        issuer: this.settings.issuer,
        audience: this.settings.audience,
      });
    } catch {
      throw new UnauthorizedError("The access token is invalid or has expired.");
    }

    // Require the claims this service issues, rather than accepting a signed
    // token that omits expiration or token identifiers.
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      !ROLES.includes(payload.role as Role) ||
      !Number.isFinite(payload.iat) ||
      !Number.isFinite(payload.exp) ||
      (payload.exp as number) <= (payload.iat as number) ||
      typeof payload.jti !== "string" ||
      payload.jti.length === 0
    ) {
      throw new UnauthorizedError("The access token is invalid or has expired.");
    }
    return { sub: payload.sub, role: payload.role as Role };
  }
}
