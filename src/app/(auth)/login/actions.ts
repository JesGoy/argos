'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginSchema } from '@/infra/validation/auth';
import { makeLoginUser } from '@/infra/container/auth';
import { AccountSuspendedError, InvalidCredentialsError } from '@/core/domain/errors/AuthErrors';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { rateLimit } from '@/infra/security/RateLimiter';
import { AUTH_RATE_LIMIT, AUTH_SESSION_MAX_AGE_SECONDS } from '@/config/security';
import { logger } from '@/infra/observability/logger';

export type LoginActionState = {
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

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const key = await clientKey('login');
  const rl = rateLimit(key, AUTH_RATE_LIMIT.LOGIN_MAX_ATTEMPTS, AUTH_RATE_LIMIT.LOGIN_WINDOW_MS);
  if (!rl.allowed) {
    logger.warn('login.rate_limited', { component: 'auth', key, retryAfter: rl.retryAfterSeconds });
    return { error: `Demasiados intentos. Intenta nuevamente en ${rl.retryAfterSeconds}s.` };
  }

  const parsed = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const uc = makeLoginUser();
    const { token } = await uc.execute(parsed.data);

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    });

    redirect('/products');
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      return { error: 'Configura JWT_SECRET (>=32 chars) en el servidor para iniciar sesión.' };
    }
    if (error instanceof InvalidCredentialsError || error instanceof AccountSuspendedError) {
      return { error: error.message };
    }

    logger.error('login.failed', { component: 'auth' }, error);
    return { error: 'No se pudo iniciar sesión' };
  }
}
