import type { EmailService } from '@/core/application/ports/EmailService';

export class NodemailerEmailService implements EmailService {
  private transporter: any | null | undefined = undefined;
  private transporterInitialized = false;
  private from: string;

  constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('NodemailerEmailService must be instantiated on the server');
    }

    this.from = process.env.EMAIL_FROM || 'no-reply@example.com';
  }

  private async getTransporter(): Promise<any | null> {
    // Return cached transporter if already initialized
    if (this.transporterInitialized) {
      return this.transporter;
    }

    try {
      const host = process.env.SMTP_HOST;

      if (!host) {
        // SMTP not configured - log clear warning
        // eslint-disable-next-line no-console
        console.warn(
          'SMTP_HOST not configured. Password reset emails will be logged to console only. Configure SMTP variables in .env.local to enable actual email sending.'
        );
        this.transporterInitialized = true;
        this.transporter = null;
        return null;
      }

      const mod = await import('nodemailer');
      const nodemailer = (mod as any).default ?? mod;

      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const secure = process.env.SMTP_SECURE === 'true';

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: Boolean(secure),
        auth: user && pass ? { user, pass } : undefined,
      });

      // eslint-disable-next-line no-console
      console.log('Nodemailer initialized successfully');

      this.transporter = transporter;
      this.transporterInitialized = true;
      return transporter;
    } catch (err) {
      // nodemailer not available or failed to initialize
      // eslint-disable-next-line no-console
      console.error('Failed to initialize nodemailer:', err);
      this.transporter = null;
      this.transporterInitialized = true;
      return null;
    }
  }

  async sendPasswordReset(email: string, pin: string): Promise<void> {
    const transporter = await this.getTransporter();

    const subject = 'Recuperación de contraseña - Argos';
    const text = `Has solicitado restablecer tu contraseña. Tu PIN de 6 dígitos es: ${pin}\n\nEste PIN expira en 15 minutos.`;
    const html = `<p>Has solicitado restablecer tu contraseña.</p><p><strong>PIN:</strong> <code>${pin}</code></p><p>Expira en 15 minutos.</p>`;

    if (!transporter) {
      // Fallback: log when nodemailer isn't available
      // eslint-disable-next-line no-console
      console.warn(`\n[EMAIL SERVICE] SMTP not configured - password reset falling back to console logging`);
      // eslint-disable-next-line no-console
      console.log(`\n=== PASSWORD RESET PIN ===`);
      // eslint-disable-next-line no-console
      console.log(`To: ${email}`);
      // eslint-disable-next-line no-console
      console.log(`PIN: ${pin}`);
      // eslint-disable-next-line no-console
      console.log(`Expires in: 15 minutes`);
      // eslint-disable-next-line no-console
      console.log(`===========================\n`);
      return;
    }

    try {
      await transporter.sendMail({
        from: this.from,
        to: email,
        subject,
        text,
        html,
      });
      // eslint-disable-next-line no-console
      console.log(`Password reset email sent successfully to ${email}`);
    } catch (err) {
      // log but don't throw — caller should treat as success to avoid leaking info
      // eslint-disable-next-line no-console
      console.error('Failed to send password reset email:', err);
    }
  }
}
