import type { SessionData } from '@/core/application/ports/SessionService';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';

export interface AuthorizeRoleInput {
  session: SessionData;
  allowedRoles: SessionData['role'][];
}

export class AuthorizeRole {
  execute(input: AuthorizeRoleInput): void {
    if (!input.allowedRoles.includes(input.session.role)) {
      throw new UnauthorizedError('No tienes permisos para esta acción');
    }
  }
}
