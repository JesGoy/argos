import type { HashService } from '@/core/application/ports/HashService';
import type { SessionService } from '@/core/application/ports/SessionService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { OrganizationRepository } from '@/core/application/ports/OrganizationRepository';
import { LoginUser } from '@/core/application/usecases/auth/LoginUser';
import { GetSession } from '@/core/application/usecases/auth/GetSession';
import { AuthorizeRole } from '@/core/application/usecases/auth/AuthorizeRole';
import { RegisterUser } from '@/core/application/usecases/auth/RegisterUser';
import { ListOrganizationUsers } from '@/core/application/usecases/auth/ListOrganizationUsers';
import { ChangeUserRole } from '@/core/application/usecases/auth/ChangeUserRole';
import { CreateUser } from '@/core/application/usecases/auth/CreateUser';
import { SetUserStatus } from '@/core/application/usecases/auth/SetUserStatus';
import {
  makeEnsureSubscription,
  makeEnforcePlanLimit,
  makeGetSubscription,
} from '@/infra/container/billing';
import { UserRepositoryDrizzle } from '@/infra/repositories/UserRepositoryDrizzle';
import { OrganizationRepositoryDrizzle } from '@/infra/repositories/OrganizationRepositoryDrizzle';
import { HashServiceBcrypt } from '@/infra/security/HashServiceBcrypt';
import { JWTSessionService } from '@/infra/security/JWTSessionService';

let userRepoInstance: UserRepository | null = null;
let organizationRepoInstance: OrganizationRepository | null = null;
let hashServiceInstance: HashService | null = null;
let sessionServiceInstance: SessionService | null = null;

export function getUserRepository(): UserRepository {
  if (!userRepoInstance) {
    userRepoInstance = new UserRepositoryDrizzle();
  }
  return userRepoInstance;
}

export function getOrganizationRepository(): OrganizationRepository {
  if (!organizationRepoInstance) {
    organizationRepoInstance = new OrganizationRepositoryDrizzle();
  }
  return organizationRepoInstance;
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
    organizations: getOrganizationRepository(),
    hash: getHashService(),
    session: getSessionService(),
    ensureSubscription: makeEnsureSubscription(),
  });
}

export function makeListOrganizationUsers(): ListOrganizationUsers {
  return new ListOrganizationUsers({ users: getUserRepository() });
}

export function makeChangeUserRole(): ChangeUserRole {
  return new ChangeUserRole({ users: getUserRepository() });
}

export function makeCreateUser(): CreateUser {
  return new CreateUser({
    users: getUserRepository(),
    hash: getHashService(),
    getSubscription: makeGetSubscription(),
    enforcePlanLimit: makeEnforcePlanLimit(),
  });
}

export function makeSetUserStatus(): SetUserStatus {
  return new SetUserStatus({ users: getUserRepository() });
}
