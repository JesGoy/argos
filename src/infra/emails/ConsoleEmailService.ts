import type { EmailService } from '@/core/application/ports/EmailService';

export class ConsoleEmailService implements EmailService {
  async sendPasswordReset(email: string, pin: string): Promise<void> {
    // Simple console/log sender for development
    // Replace with real email provider (SES, SMTP, etc.) in production
    // eslint-disable-next-line no-console
    console.log(`Sending password reset to ${email} with PIN ${pin}`);
  }
}
