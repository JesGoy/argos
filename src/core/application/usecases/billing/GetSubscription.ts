import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { Subscription } from '@/core/domain/entities/Subscription';
import { isPeriodExpired } from '@/core/domain/entities/Subscription';
import { EnsureSubscription } from './EnsureSubscription';
import { calendarMonthBoundsUtc } from './period';

/**
 * Read the subscription for an org, rolling over the period lazily.
 *
 * Self-heals on missing rows by delegating to `EnsureSubscription`, so legacy
 * orgs that pre-date the 1:1 invariant (or seed-data gaps) get a Free row on
 * first read instead of crashing every billing-aware flow.
 *
 * Lazy rollover replaces a cron job for the MVP: the first read after a period
 * end resets `aiCallsUsedThisPeriod` to 0 and moves the window to the calendar
 * month containing `now`. Subsequent reads are no-ops until the next period
 * boundary.
 */
export class GetSubscription {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly ensure: EnsureSubscription,
  ) {}

  async execute(organizationId: number, now: Date = new Date()): Promise<Subscription> {
    const current = await this.ensure.execute(organizationId, now);

    if (!isPeriodExpired(current, now)) return current;

    const { start, end } = calendarMonthBoundsUtc(now);
    return this.subscriptions.update(organizationId, {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      aiCallsUsedThisPeriod: 0,
    });
  }
}
