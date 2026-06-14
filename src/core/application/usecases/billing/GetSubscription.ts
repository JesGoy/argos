import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { Subscription } from '@/core/domain/entities/Subscription';
import { isPeriodExpired } from '@/core/domain/entities/Subscription';
import { SubscriptionNotFoundError } from '@/core/domain/errors/BillingErrors';
import { calendarMonthBoundsUtc } from './period';

/**
 * Read the subscription for an org, rolling over the period lazily.
 *
 * Lazy rollover replaces a cron job for the MVP: the first read after a period
 * end resets `aiCallsUsedThisPeriod` to 0 and moves the window to the calendar
 * month containing `now`. Subsequent reads are no-ops until the next period
 * boundary.
 */
export class GetSubscription {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async execute(organizationId: number, now: Date = new Date()): Promise<Subscription> {
    const current = await this.subscriptions.findByOrganizationId(organizationId);
    if (!current) throw new SubscriptionNotFoundError(organizationId);

    if (!isPeriodExpired(current, now)) return current;

    const { start, end } = calendarMonthBoundsUtc(now);
    return this.subscriptions.update(organizationId, {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      aiCallsUsedThisPeriod: 0,
    });
  }
}
