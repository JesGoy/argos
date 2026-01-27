'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resetPasswordSchema } from '@/infra/validation/auth';
import { makeResetPassword } from '@/infra/container/auth';
import {
  PasswordResetNotFoundError,
  PasswordResetExpiredError,
  PasswordResetUsedError,
} from '@/core/domain/errors/AuthErrors';

export type ResetPasswordActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function resetPasswordAction(
  _prevState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const parsed = resetPasswordSchema.safeParse({
    pin: formData.get('pin'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { pin, newPassword } = parsed.data;
  const confirm = String(formData.get('confirmPassword'));

  if (newPassword !== confirm) {
    return { fieldErrors: { confirmPassword: ['Las contraseñas no coinciden'] } };
  }

  try {
    const uc = makeResetPassword();
    const { token } = await uc.execute({ pin, newPassword });

    const cookieStore = await cookies();
    cookieStore.set('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    redirect('/products');
  } catch (err) {
    if (err instanceof PasswordResetNotFoundError) {
      return { error: 'PIN inválido' };
    }
    if (err instanceof PasswordResetExpiredError) {
      return { error: 'PIN expirado' };
    }
    if (err instanceof PasswordResetUsedError) {
      return { error: 'PIN ya usado' };
    }

    return { error: 'No se pudo restablecer la contraseña' };
  }
}
