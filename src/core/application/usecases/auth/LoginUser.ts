import type { HashService } from '@/core/application/ports/HashService';
import type { SessionData, SessionService } from '@/core/application/ports/SessionService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import { InvalidCredentialsError } from '@/core/domain/errors/AuthErrors';

export interface LoginUserInput {
  identifier: string; // email or username
  password: string;
}

export interface LoginUserOutput {
  token: string;
  session: SessionData;
}

/**
 * Use Case: LoginUser
 * Validates credentials and returns a signed session token
 */
export class LoginUser {
  constructor(
    private readonly deps: {
      users: UserRepository;
      hash: HashService;
      session: SessionService;
    }
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const user = await this.findUser(input.identifier);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isValid = await this.deps.hash.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    const session: SessionData = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = await this.deps.session.sign(session);
    return { token, session };
  }

  private async findUser(identifier: string) {
    const normalized = identifier.trim();
    const byEmail = normalized.includes('@');

    if (byEmail) {
      return (await this.deps.users.findByEmail(normalized)) ?? undefined;
    }

    return (await this.deps.users.findByUsername(normalized)) ?? undefined;
  }
}
