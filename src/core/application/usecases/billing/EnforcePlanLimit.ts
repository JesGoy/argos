import {
  PLAN_LIMITS,
  type PlanLimitType,
  type PlanType,
} from '@/core/domain/constants/BillingConstants';
import { PlanLimitExceededError } from '@/core/domain/errors/BillingErrors';

export interface EnforcePlanLimitInput {
  plan: PlanType;
  limitType: PlanLimitType;
  current: number;
}

/**
 * Throws `PlanLimitExceededError` when the mutation would push usage past the
 * plan cap. Caller must compute `current` BEFORE the mutation (e.g. the
 * existing row count when adding one). Business plan has `POSITIVE_INFINITY`
 * caps so this is always a no-op there.
 */
export class EnforcePlanLimit {
  execute(input: EnforcePlanLimitInput): void {
    const max = this.getMax(input.plan, input.limitType);
    if (input.current >= max) {
      throw new PlanLimitExceededError(input.limitType, input.current, max, input.plan);
    }
  }

  private getMax(plan: PlanType, limitType: PlanLimitType): number {
    const limits = PLAN_LIMITS[plan];
    if (limitType === 'aiCalls') return limits.aiCallsPerMonth;
    return limits[limitType];
  }
}
