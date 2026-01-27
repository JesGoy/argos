import type { HashService } from '@/core/application/ports/HashService';
import type { SessionService } from '@/core/application/ports/SessionService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import { LoginUser } from '@/core/application/usecases/auth/LoginUser';
import { GetSession } from '@/core/application/usecases/auth/GetSession';
import { AuthorizeRole } from '@/core/application/usecases/auth/AuthorizeRole';
import { RegisterUser } from '@/core/application/usecases/auth/RegisterUser';
import { UserRepositoryDrizzle } from '@/infra/repositories/UserRepositoryDrizzle';
import { PasswordResetRepositoryDrizzle } from '@/infra/repositories/PasswordResetRepositoryDrizzle';
import { ConsoleEmailService } from '@/infra/emails/ConsoleEmailService';
import { NodemailerEmailService } from '@/infra/emails/NodemailerEmailService';
import type { PasswordResetRepository } from '@/core/application/ports/PasswordResetRepository';
import type { EmailService } from '@/core/application/ports/EmailService';
import { HashServiceBcrypt } from '@/infra/security/HashServiceBcrypt';
import { JWTSessionService } from '@/infra/security/JWTSessionService';

let userRepoInstance: UserRepository | null = null;
let hashServiceInstance: HashService | null = null;
let sessionServiceInstance: SessionService | null = null;
let passwordResetRepoInstance: PasswordResetRepository | null = null;
let emailServiceInstance: EmailService | null = null;

export function getUserRepository(): UserRepository {
  if (!userRepoInstance) {
    userRepoInstance = new UserRepositoryDrizzle();
  }
  return userRepoInstance;
}

export function getHashService(): HashService {
  if (!hashServiceInstance) {
    hashServiceInstance = new HashServiceBcrypt();
  }
  return hashServiceInstance;
}

export function getSessionService(): SessionService {
  if (!sessionServiceInstance) {
    sessionServiceInstance = new JWTSessionService();
  }
  return sessionServiceInstance;
}

export function getPasswordResetRepository(): PasswordResetRepository {
  if (!passwordResetRepoInstance) {
    passwordResetRepoInstance = new PasswordResetRepositoryDrizzle();
  }
  return passwordResetRepoInstance;
}

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    // Prefer Nodemailer if SMTP is configured
    try {
      if (process.env.SMTP_HOST) {
        emailServiceInstance = new NodemailerEmailService();
      } else {
        emailServiceInstance = new ConsoleEmailService();
      }
    } catch (err) {
      // If nodemailer not installed or misconfigured, fallback to console
      // eslint-disable-next-line no-console
      console.warn('Nodemailer not available or misconfigured, using ConsoleEmailService');
      emailServiceInstance = new ConsoleEmailService();
    }
  }

  return emailServiceInstance;
}

export function makeLoginUser(): LoginUser {
  return new LoginUser({
    users: getUserRepository(),
    hash: getHashService(),
    session: getSessionService(),
  });
}

export function makeGetSession(): GetSession {
  return new GetSession({ session: getSessionService() });
}

export function makeAuthorizeRole(): AuthorizeRole {
  return new AuthorizeRole();
}

export function makeRegisterUser(): RegisterUser {
  return new RegisterUser({
    users: getUserRepository(),
    hash: getHashService(),
    session: getSessionService(),
  });
}

import { RequestPasswordReset } from '@/core/application/usecases/auth/RequestPasswordReset';
import { ResetPassword } from '@/core/application/usecases/auth/ResetPassword';

export function makeRequestPasswordReset(): RequestPasswordReset {
  return new RequestPasswordReset({
    users: getUserRepository(),
    passwordResets: getPasswordResetRepository(),
    email: getEmailService(),
  });
}

export function makeResetPassword(): ResetPassword {
  return new ResetPassword({
    users: getUserRepository(),
    passwordResets: getPasswordResetRepository(),
    hash: getHashService(),
    session: getSessionService(),
  });
}
