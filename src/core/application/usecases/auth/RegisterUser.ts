import type { HashService } from '@/core/application/ports/HashService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { SessionData, SessionService } from '@/core/application/ports/SessionService';
import { DuplicateUserError } from '@/core/domain/errors/AuthErrors';

export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role?: SessionData['role'];
}

export interface RegisterUserOutput {
  token: string;
  session: SessionData;
}

/**
 * Use Case: RegisterUser
 * Creates a user hashing the password and returns signed session token
 */
export class RegisterUser {
  constructor(
    private readonly deps: {
      users: UserRepository;
      hash: HashService;
      session: SessionService;
    }
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    await this.ensureUnique(input);

    const passwordHash = await this.deps.hash.hash(input.password);

    const user = await this.deps.users.create({
      username: input.username,
      email: input.email,
      passwordHash,
      role: input.role ?? 'viewer',
      fullName: input.fullName,
    });

    const session: SessionData = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = await this.deps.session.sign(session);
    return { token, session };
  }

  private async ensureUnique(input: RegisterUserInput) {
    const [byEmail, byUsername] = await Promise.all([
      this.deps.users.findByEmail(input.email),
      this.deps.users.findByUsername(input.username),
    ]);

    if (byEmail) {
      throw new DuplicateUserError('email');
    }
    if (byUsername) {
      throw new DuplicateUserError('username');
    }
  }
}
