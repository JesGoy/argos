'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/app/lib/auth';
import { APP_ROUTE } from '@/config/routes';
import { PLAN_TYPES, type PlanLimitType, type PlanType } from '@/core/domain/constants/BillingConstants';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { PlanLimitExceededError } from '@/core/domain/errors/BillingErrors';
import { makeBillingProvider } from '@/infra/container/billing';

export interface BillingFormState {
  success?: boolean;
  error?: string;
  /** Set when the new plan was applied immediately by the stub provider. */
  stubbed?: boolean;
  /** Carries the limit info so the UI can render a targeted CTA. */
  limit?: {
    limitType: PlanLimitType;
    current: number;
    max: number;
    plan: PlanType;
  };
}

const changePlanSchema = z.object({
  targetPlan: z.enum(PLAN_TYPES),
});

export async function changePlanAction(
  _prevState: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const session = await requireRole([USER_ROLE.ADMIN]);

  const parsed = changePlanSchema.safeParse({
    targetPlan: formData.get('targetPlan'),
  });

  if (!parsed.success) {
    return { error: 'Plan inválido.' };
  }

  let result;
  try {
    const provider = makeBillingProvider(session.organizationId);
    result = await provider.createCheckoutSession({
      session,
      targetPlan: parsed.data.targetPlan,
    });
  } catch (error) {
    if (error instanceof PlanLimitExceededError) {
      return {
        error: error.message,
        limit: {
          limitType: error.limitType,
          current: error.current,
          max: error.max,
          plan: error.plan,
        },
      };
    }
    return { error: 'No se pudo cambiar el plan. Intenta nuevamente.' };
  }

  revalidatePath(APP_ROUTE.BILLING);

  if (result.kind === 'stubbed') {
    return { success: true, stubbed: true };
  }

  // Real provider (e.g. Stripe): hand the client off to the hosted checkout.
  // `redirect` throws NEXT_REDIRECT, so it must run outside the try/catch.
  redirect(result.url);
}
