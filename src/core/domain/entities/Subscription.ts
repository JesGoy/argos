import type { PlanType, SubscriptionStatus } from '@/core/domain/constants/BillingConstants';

/**
 * Subscription Domain Entity
 *
 * One row per organization (1:1). Tracks plan, billing period and usage counter
 * for the AI-call quota. Period is calendar-month aligned; the counter rolls
 * over lazily via `rolloverPeriod` the next time the subscription is read.
 */
export interface Subscription {
  id: number;
  organizationId: number;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  aiCallsUsedThisPeriod: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionInput {
  organizationId: number;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export type UpdateSubscriptionInput = Partial<{
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  aiCallsUsedThisPeriod: number;
}>;

/**
 * True when `now` is past the period end and the counter must reset before the
 * next quota check.
 */
export function isPeriodExpired(subscription: Subscription, now: Date): boolean {
  return now.getTime() > subscription.currentPeriodEnd.getTime();
}

/**
 * Compute the patch that rolls the subscription into the calendar month
 * containing `now` and resets the AI-call counter. Pure helper — the caller
 * persists the resulting object.
 */
export function rolloverPeriod(
  subscription: Subscription,
  now: Date,
  periodBounds: (date: Date) => { start: Date; end: Date }
): Subscription {
  const { start, end } = periodBounds(now);
  return {
    ...subscription,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    aiCallsUsedThisPeriod: 0,
    updatedAt: now,
  };
}
