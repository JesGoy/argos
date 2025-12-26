'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginSchema } from '@/infra/validation/auth';
import { makeLoginUser } from '@/infra/container/auth';
import { InvalidCredentialsError } from '@/core/domain/errors/AuthErrors';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export type LoginActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
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
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8, // 8h
    });

    redirect('/products');
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      return { error: 'Configura JWT_SECRET (>=32 chars) en el servidor para iniciar sesión.' };
    }
    if (error instanceof InvalidCredentialsError) {
      return { error: error.message };
    }

    return { error: 'No se pudo iniciar sesión' };
  }
}
