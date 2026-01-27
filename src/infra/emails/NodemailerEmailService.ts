'use server';

import type { EmailService } from '@/core/application/ports/EmailService';

export class NodemailerEmailService implements EmailService {
  private transporter: any;
  private from: string;

  constructor() {
    // Lazy require to avoid breaking environments without nodemailer installed
    // and to keep this module server-only.
    // Expected env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
    // SMTP_PORT is optional and parsed as number.
    // If nodemailer is not installed, the constructor will throw and container will fallback.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const nodemailer = require('nodemailer');

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true';
    this.from = process.env.EMAIL_FROM || (user ?? 'no-reply@example.com');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: Boolean(secure),
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendPasswordReset(email: string, pin: string): Promise<void> {
    const subject = 'Recuperación de contraseña - Argos';
    const text = `Has solicitado restablecer tu contraseña. Tu PIN de 6 dígitos es: ${pin}\n\nEste PIN expira en 15 minutos.`;
    const html = `<p>Has solicitado restablecer tu contraseña.</p><p><strong>PIN:</strong> <code>${pin}</code></p><p>Expira en 15 minutos.</p>`;

    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject,
      text,
      html,
    });
  }
}
