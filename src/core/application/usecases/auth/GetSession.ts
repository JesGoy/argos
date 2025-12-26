import type { SessionData, SessionService } from '@/core/application/ports/SessionService';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';

export interface GetSessionInput {
  token: string | null;
}

export class GetSession {
  constructor(private readonly deps: { session: SessionService }) {}

  async execute(input: GetSessionInput): Promise<SessionData> {
    if (!input.token) {
      throw new UnauthorizedError('Sesión no encontrada');
    }

    try {
      return await this.deps.session.verify(input.token);
    } catch (error) {
      throw new UnauthorizedError('Token inválido o expirado');
    }
  }
}
