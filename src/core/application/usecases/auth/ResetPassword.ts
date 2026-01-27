import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { PasswordResetRepository } from '@/core/application/ports/PasswordResetRepository';
import type { HashService } from '@/core/application/ports/HashService';
import type { SessionService } from '@/core/application/ports/SessionService';
import { PasswordResetNotFoundError, PasswordResetExpiredError, PasswordResetUsedError } from '@/core/domain/errors/AuthErrors';

export interface ResetPasswordInput {
  pin: string;
  newPassword: string;
}

export interface ResetPasswordOutput {
  token: string;
}

export class ResetPassword {
  constructor(
    private deps: {
      users: UserRepository;
      passwordResets: PasswordResetRepository;
      hash: HashService;
      session: SessionService;
    }
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const pr = await this.deps.passwordResets.findByPin(input.pin);
    if (!pr) throw new PasswordResetNotFoundError();

    if (pr.used) throw new PasswordResetUsedError();
    if (new Date(pr.expiresAt) < new Date()) throw new PasswordResetExpiredError();

    const user = await this.deps.users.findById(pr.userId);
    if (!user) throw new Error('Usuario no encontrado');

    const passwordHash = await this.deps.hash.hash(input.newPassword);
    await this.deps.users.update(user.id, { passwordHash });

    await this.deps.passwordResets.markAsUsed(pr.id);

    const sessionData = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = await this.deps.session.sign(sessionData);
    return { token };
  }
}
