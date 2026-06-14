'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { makeUpdateOrganization } from '@/infra/container/organizations';
import { updateOrganizationSchema } from '@/infra/validation/organization';
import { APP_ROUTE } from '@/config/routes';

export interface SettingsFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    name?: string[];
    businessType?: string[];
    currency?: string[];
    timezone?: string[];
  };
}

export async function updateSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const session = await requireRole([USER_ROLE.ADMIN]);

  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get('name'),
    businessType: formData.get('businessType'),
    currency: formData.get('currency'),
    timezone: formData.get('timezone'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await makeUpdateOrganization().execute(String(session.organizationId), parsed.data);
    revalidatePath(APP_ROUTE.SETTINGS);
    return { success: true };
  } catch {
    return { error: 'Error al guardar la configuración' };
  }
}
