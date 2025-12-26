import { cookies } from 'next/headers';
import { makeGetSession } from '@/infra/container/auth';
import type { SessionData } from '@/core/application/ports/SessionService';
import { redirect } from 'next/navigation';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';

/**
 * Reads session from the signed JWT stored in the cookie.
 * Returns null if missing/invalid.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value ?? null;
  const useCase = makeGetSession();

  try {
    return await useCase.execute({ token });
  } catch (error) {
    return null;
  }
}

/**
 * Requires an authenticated session; redirects to /login if missing.
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Requires a role; redirects on missing session and throws on unauthorized.
 */
export async function requireRole(allowedRoles: SessionData['role'][]): Promise<SessionData> {
  const session = await requireSession();
  if (!allowedRoles.includes(session.role)) {
    throw new UnauthorizedError('No tienes permisos para esta acción');
  }
  return session;
}
