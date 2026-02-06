'use server';

import { forgotPasswordSchema } from '@/infra/validation/auth';
import { makeRequestPasswordReset } from '@/infra/container/auth';
import { z } from 'zod';

export type ForgotPasswordActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
};

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const uc = makeRequestPasswordReset();
    await uc.execute({ email: parsed.data.email });
    return { success: 'Si existe una cuenta, recibirás un correo con el PIN.' };
  } catch (err) {
    // Log full error for debugging in development
    // eslint-disable-next-line no-console
    console.error('forgotPasswordAction error:', err);
    return { error: 'No se pudo procesar la solicitud de recuperación' };
  }
}
