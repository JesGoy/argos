import { SignJWT, jwtVerify } from 'jose';
import type { SessionData, SessionService } from '@/core/application/ports/SessionService';

const encoder = new TextEncoder();

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be defined and at least 32 chars long');
  }
  return encoder.encode(secret);
}

function assertRole(role: unknown): role is SessionData['role'] {
  return role === 'admin' || role === 'warehouse_manager' || role === 'operator' || role === 'viewer';
}

export class JWTSessionService implements SessionService {
  private readonly secret = getSecret();
  private readonly expiration = '8h';

  async sign(payload: SessionData): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(this.expiration)
      .sign(this.secret);
  }

  async verify(token: string): Promise<SessionData> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
    });

    if (!assertRole(payload.role)) {
      throw new Error('Invalid role in token');
    }

    return {
      userId: String(payload.userId),
      username: String(payload.username),
      email: String(payload.email),
      role: payload.role,
    };
  }
}
