import { describe, it, expect, vi } from 'vitest';
import { GetSubscription } from './GetSubscription';
import { SubscriptionNotFoundError } from '@/core/domain/errors/BillingErrors';
import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { Subscription } from '@/core/domain/entities/Subscription';

function makeRepo(initial: Subscription | null) {
  let current = initial;
  const repo: SubscriptionRepository = {
    findByOrganizationId: vi.fn().mockImplementation(async () => current),
    create: vi.fn(),
    update: vi.fn().mockImplementation(async (_orgId, patch) => {
      if (!current) throw new Error('no sub');
      current = { ...current, ...patch, updatedAt: new Date() };
      return current;
    }),
    incrementAiCalls: vi.fn(),
  };
  return repo;
}

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    organizationId: 42,
    plan: 'free',
    status: 'active',
    currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
    aiCallsUsedThisPeriod: 25,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('GetSubscription', () => {
  it('throws SubscriptionNotFoundError when no row exists', async () => {
    const uc = new GetSubscription(makeRepo(null));
    await expect(uc.execute(99)).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });

  it('returns the subscription unchanged when the period is still active', async () => {
    const sub = makeSub();
    const repo = makeRepo(sub);
    const uc = new GetSubscription(repo);

    const out = await uc.execute(42, new Date('2026-06-15T10:00:00.000Z'));

    expect(out.aiCallsUsedThisPeriod).toBe(25);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rolls the period and resets the counter when now is past currentPeriodEnd', async () => {
    const sub = makeSub();
    const repo = makeRepo(sub);
    const uc = new GetSubscription(repo);

    const now = new Date('2026-07-05T12:00:00.000Z');
    const out = await uc.execute(42, now);

    expect(out.aiCallsUsedThisPeriod).toBe(0);
    expect(out.currentPeriodStart.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(out.currentPeriodEnd.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('is idempotent within the same period (second call does not roll again)', async () => {
    const sub = makeSub();
    const repo = makeRepo(sub);
    const uc = new GetSubscription(repo);

    const now = new Date('2026-07-05T12:00:00.000Z');
    await uc.execute(42, now);
    await uc.execute(42, new Date('2026-07-06T12:00:00.000Z'));

    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
