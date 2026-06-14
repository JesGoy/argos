import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { Subscription } from '@/core/domain/entities/Subscription';
import {
  PLAN_TYPE,
  SUBSCRIPTION_STATUS,
} from '@/core/domain/constants/BillingConstants';
import { calendarMonthBoundsUtc } from './period';

/**
 * Ensure a Free subscription exists for the organization. Called by
 * RegisterUser when a brand-new org is created so every org has exactly one
 * subscription row (1:1) and the rest of the billing code can read without
 * null checks.
 *
 * Idempotent: if a subscription already exists, returns it untouched.
 */
export class EnsureSubscription {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async execute(organizationId: number, now: Date = new Date()): Promise<Subscription> {
    const existing = await this.subscriptions.findByOrganizationId(organizationId);
    if (existing) return existing;

    const { start, end } = calendarMonthBoundsUtc(now);
    return this.subscriptions.create({
      organizationId,
      plan: PLAN_TYPE.FREE,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    });
  }
}
