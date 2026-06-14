import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { SessionData } from '@/core/application/ports/SessionService';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { USER_ROLE, type UserRole, USER_ROLES } from '@/core/domain/constants/UserConstants';

export interface ChangeUserRoleDeps {
  users: UserRepository;
}

export interface ChangeUserRoleInput {
  targetUserId: string;
  newRole: UserRole;
}

/**
 * Admin-only: change another user's role within the same organization. Refuses
 * cross-org changes and refuses to demote the actor's own account (would lock
 * out the only admin in the org).
 */
export class ChangeUserRole {
  constructor(private readonly deps: ChangeUserRoleDeps) {}

  async execute(actor: SessionData, input: ChangeUserRoleInput): Promise<void> {
    if (actor.role !== USER_ROLE.ADMIN) {
      throw new UnauthorizedError('Solo administradores pueden cambiar roles');
    }
    if (!USER_ROLES.includes(input.newRole)) {
      throw new Error('Rol inválido');
    }
    const target = await this.deps.users.findById(input.targetUserId);
    if (!target) {
      throw new Error('Usuario no encontrado');
    }
    if (target.organizationId !== actor.organizationId) {
      throw new UnauthorizedError('No tienes permisos sobre este usuario');
    }
    if (String(target.id) === String(actor.userId) && input.newRole !== USER_ROLE.ADMIN) {
      throw new Error('No puedes quitarte el rol admin a ti mismo');
    }
    if (target.role === input.newRole) return;

    await this.deps.users.update(input.targetUserId, { role: input.newRole });
  }
}
