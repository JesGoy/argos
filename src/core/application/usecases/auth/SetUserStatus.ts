import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { SessionData } from '@/core/application/ports/SessionService';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import {
  USER_ROLE,
  USER_STATUSES,
  type UserStatus,
} from '@/core/domain/constants/UserConstants';

export interface SetUserStatusDeps {
  users: UserRepository;
}

export interface SetUserStatusInput {
  targetUserId: string;
  status: UserStatus;
}

/**
 * Admin-only: suspend or reactivate another user in the same organization.
 * Mirrors {@link ChangeUserRole}'s guards — refuses cross-org targets and
 * refuses to change the actor's own status (an admin can't lock themselves out).
 */
export class SetUserStatus {
  constructor(private readonly deps: SetUserStatusDeps) {}

  async execute(actor: SessionData, input: SetUserStatusInput): Promise<void> {
    if (actor.role !== USER_ROLE.ADMIN) {
      throw new UnauthorizedError('Solo administradores pueden cambiar el estado de usuarios');
    }
    if (!USER_STATUSES.includes(input.status)) {
      throw new Error('Estado inválido');
    }

    const target = await this.deps.users.findById(input.targetUserId);
    if (!target) {
      throw new Error('Usuario no encontrado');
    }
    if (target.organizationId !== actor.organizationId) {
      throw new UnauthorizedError('No tienes permisos sobre este usuario');
    }
    if (String(target.id) === String(actor.userId)) {
      throw new Error('No puedes cambiar tu propio estado');
    }
    if (target.status === input.status) return;

    await this.deps.users.update(input.targetUserId, { status: input.status });
  }
}
