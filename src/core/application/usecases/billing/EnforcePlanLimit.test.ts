import { describe, it, expect } from 'vitest';
import { EnforcePlanLimit } from './EnforcePlanLimit';
import { PlanLimitExceededError } from '@/core/domain/errors/BillingErrors';
import {
  PLAN_LIMITS,
  type PlanLimitType,
  type PlanType,
} from '@/core/domain/constants/BillingConstants';

function capOf(plan: PlanType, limitType: PlanLimitType): number {
  const limits = PLAN_LIMITS[plan];
  return limitType === 'aiCalls' ? limits.aiCallsPerMonth : limits[limitType];
}

const cases: Array<[PlanType, PlanLimitType]> = [
  ['free', 'users'],
  ['free', 'products'],
  ['free', 'aiCalls'],
  ['pro', 'users'],
  ['pro', 'products'],
  ['pro', 'aiCalls'],
];

describe('EnforcePlanLimit', () => {
  const enforcer = new EnforcePlanLimit();

  it.each(cases)('allows when current is below cap (plan=%s, limit=%s)', (plan, limitType) => {
    const max = capOf(plan, limitType);
    expect(() =>
      enforcer.execute({ plan, limitType, current: max - 1 }),
    ).not.toThrow();
  });

  it.each(cases)('throws PlanLimitExceededError at cap (plan=%s, limit=%s)', (plan, limitType) => {
    const max = capOf(plan, limitType);
    expect(() =>
      enforcer.execute({ plan, limitType, current: max }),
    ).toThrow(PlanLimitExceededError);
  });

  it('throws with structured info (plan, limitType, current, max)', () => {
    try {
      enforcer.execute({ plan: 'free', limitType: 'products', current: 50 });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PlanLimitExceededError);
      const e = err as PlanLimitExceededError;
      expect(e.plan).toBe('free');
      expect(e.limitType).toBe('products');
      expect(e.current).toBe(50);
      expect(e.max).toBe(50);
    }
  });

  it('never throws for business plan (POSITIVE_INFINITY caps)', () => {
    for (const limitType of ['users', 'products', 'aiCalls'] as const) {
      expect(() =>
        enforcer.execute({ plan: 'business', limitType, current: 1_000_000 }),
      ).not.toThrow();
    }
  });
});
