import type { Role } from "../../domain/user";

export interface AccessTokenClaims {
  sub: string;
  role: Role;
}

export interface IssuedToken {
  accessToken: string;
  expiresIn: number;
}

export interface TokenService {
  issue(claims: AccessTokenClaims): IssuedToken;
  /** Throws UnauthorizedError when the token is invalid or expired. */
  verify(token: string): AccessTokenClaims;
}
