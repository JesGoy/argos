import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { SessionData } from '@/core/application/ports/SessionService';
import type { User } from '@/core/domain/entities/User';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';

export interface ListOrganizationUsersDeps {
  users: UserRepository;
}

/**
 * Lists all users in the actor's organization. Admin-only: managing users
 * is the only purpose of this read, so non-admin actors cannot pivot through it
 * to enumerate accounts. The repository call is scoped by organizationId to
 * preserve tenant isolation.
 */
export class ListOrganizationUsers {
  constructor(private readonly deps: ListOrganizationUsersDeps) {}

  async execute(actor: SessionData): Promise<User[]> {
    if (actor.role !== USER_ROLE.ADMIN) {
      throw new UnauthorizedError('Solo administradores pueden listar usuarios');
    }
    return this.deps.users.findByOrganization(actor.organizationId);
  }
}
