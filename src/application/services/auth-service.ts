import { InvalidCredentialsError, UnauthorizedError } from "../../domain/errors";
import { normalizeEmail, toPublicUser, type PublicUser } from "../../domain/user";
import type { PasswordHasher } from "../ports/password-hasher";
import type { IssuedToken, TokenService } from "../ports/token-service";
import type { UserRepository } from "../ports/user-repository";

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async login(email: string, password: string): Promise<IssuedToken> {
    const user = await this.users.findByEmail(normalizeEmail(email));

    // Verify the password even for inactive users so both paths take similar time.
    const passwordMatches = user ? await this.hasher.verify(user.passwordHash, password) : false;
    if (!user || !passwordMatches || !user.isActive) {
      throw new InvalidCredentialsError();
    }

    return this.tokens.issue({ sub: user.id, role: user.role });
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("The account is not available.");
    }
    return toPublicUser(user);
  }
}
