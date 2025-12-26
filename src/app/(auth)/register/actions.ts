'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { registerSchema } from '@/infra/validation/auth';
import { makeRegisterUser } from '@/infra/container/auth';
import { DuplicateUserError } from '@/core/domain/errors/AuthErrors';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export type RegisterActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function registerAction(
  _prev: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName') || undefined,
    role: formData.get('role') || undefined,
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
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    redirect('/products');
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
    return { error: 'No se pudo registrar el usuario' };
  }
}
