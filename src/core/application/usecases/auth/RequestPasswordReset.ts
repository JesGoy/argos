import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { PasswordResetRepository } from '@/core/application/ports/PasswordResetRepository';
import type { EmailService } from '@/core/application/ports/EmailService';

export interface RequestPasswordResetInput {
  email: string;
}

export class RequestPasswordReset {
  constructor(private deps: { users: UserRepository; passwordResets: PasswordResetRepository; email: EmailService }) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const normalized = input.email.trim().toLowerCase();
    const user = await this.deps.users.findByEmail(normalized);

    // Don't reveal existence of user: behave as if request succeeded even if user not found
    if (!user) {
      return;
    }

    // generate 6-digit PIN
    const pin = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.deps.passwordResets.create({
      userId: String(user.id),
      pin,
      expiresAt,
    });

    await this.deps.email.sendPasswordReset(user.email, pin);
  }
}
