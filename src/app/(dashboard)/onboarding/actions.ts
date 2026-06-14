'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import {
  ORGANIZATION_DEFAULTS,
  type BusinessType,
} from '@/core/domain/constants/OrganizationConstants';
import { updateOrganizationSchema } from '@/infra/validation/organization';
import { makeGetOrganization, makeUpdateOrganization } from '@/infra/container/organizations';
import { makeSeedDemoData } from '@/infra/container/onboarding';
import { APP_ROUTE } from '@/config/routes';
import { logger } from '@/infra/observability/logger';

export interface OnboardingProfileState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    name?: string[];
    businessType?: string[];
    currency?: string[];
    timezone?: string[];
  };
}

export async function saveProfileAction(
  _prevState: OnboardingProfileState,
  formData: FormData,
): Promise<OnboardingProfileState> {
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
    revalidatePath(APP_ROUTE.ONBOARDING);
    return { success: true };
  } catch (err) {
    logger.error('onboarding.save_profile.failed', { component: 'onboarding' }, err);
    return { error: 'No se pudo guardar la configuración' };
  }
}

export interface DemoDataState {
  success?: boolean;
  error?: string;
  created?: number;
  skipped?: number;
}

export async function loadDemoDataAction(): Promise<DemoDataState> {
  const session = await requireRole([USER_ROLE.ADMIN]);

  try {
    const org = await makeGetOrganization().execute(String(session.organizationId));
    const businessType: BusinessType = org?.businessType ?? ORGANIZATION_DEFAULTS.BUSINESS_TYPE;

    const result = await makeSeedDemoData(session.organizationId).execute({
      businessType,
      userId: Number(session.userId),
    });

    revalidatePath(APP_ROUTE.PRODUCTS);
    revalidatePath(APP_ROUTE.DASHBOARD);
    revalidatePath(APP_ROUTE.ONBOARDING);

    return { success: true, created: result.productsCreated, skipped: result.skipped };
  } catch (err) {
    logger.error('onboarding.load_demo.failed', { component: 'onboarding' }, err);
    return { error: 'No se pudieron cargar los datos de ejemplo' };
  }
}
