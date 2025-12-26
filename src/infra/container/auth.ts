import type { HashService } from '@/core/application/ports/HashService';
import type { SessionService } from '@/core/application/ports/SessionService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import { LoginUser } from '@/core/application/usecases/auth/LoginUser';
import { GetSession } from '@/core/application/usecases/auth/GetSession';
import { AuthorizeRole } from '@/core/application/usecases/auth/AuthorizeRole';
import { RegisterUser } from '@/core/application/usecases/auth/RegisterUser';
import { UserRepositoryDrizzle } from '@/infra/repositories/UserRepositoryDrizzle';
import { HashServiceBcrypt } from '@/infra/security/HashServiceBcrypt';
import { JWTSessionService } from '@/infra/security/JWTSessionService';

let userRepoInstance: UserRepository | null = null;
let hashServiceInstance: HashService | null = null;
let sessionServiceInstance: SessionService | null = null;

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
