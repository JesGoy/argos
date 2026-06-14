'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { registerSchema } from '@/infra/validation/auth';
import { makeRegisterUser } from '@/infra/container/auth';
import { DuplicateUserError } from '@/core/domain/errors/AuthErrors';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { rateLimit } from '@/infra/security/RateLimiter';
import { AUTH_RATE_LIMIT, AUTH_SESSION_MAX_AGE_SECONDS } from '@/config/security';
import { logger } from '@/infra/observability/logger';

export type RegisterActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function clientKey(prefix: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown';
  return `${prefix}:${ip}`;
}

export async function registerAction(
  _prev: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const key = await clientKey('register');
  const rl = rateLimit(key, AUTH_RATE_LIMIT.REGISTER_MAX_ATTEMPTS, AUTH_RATE_LIMIT.REGISTER_WINDOW_MS);
  if (!rl.allowed) {
    logger.warn('register.rate_limited', { component: 'auth', key, retryAfter: rl.retryAfterSeconds });
    return { error: `Demasiadas solicitudes. Intenta nuevamente en ${rl.retryAfterSeconds}s.` };
  }

  const parsed = registerSchema.safeParse({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName') || undefined,
    organizationName: formData.get('organizationName') || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const uc = makeRegisterUser();
    const { token } = await uc.execute(parsed.data);

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    });

    // New org owner → guided onboarding (set profile + optional demo data).
    redirect('/onboarding');
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      return { error: 'Configura JWT_SECRET (>=32 chars) antes de registrar usuarios.' };
    }
    if (error instanceof DuplicateUserError) {
      return { error: error.message };
    }
    logger.error('register.failed', { component: 'auth' }, error);
    return { error: 'No se pudo registrar el usuario' };
  }
}
