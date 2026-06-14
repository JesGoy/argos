import { describe, it, expect, vi } from 'vitest';
import { GetSubscription } from './GetSubscription';
import { EnsureSubscription } from './EnsureSubscription';
import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { Subscription } from '@/core/domain/entities/Subscription';

function makeRepo(initial: Subscription | null) {
  let current = initial;
  const repo: SubscriptionRepository = {
    findByOrganizationId: vi.fn().mockImplementation(async () => current),
    create: vi.fn().mockImplementation(async (input) => {
      current = {
        id: 1,
        organizationId: input.organizationId,
        plan: input.plan,
        status: input.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        aiCallsUsedThisPeriod: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return current;
    }),
    update: vi.fn().mockImplementation(async (_orgId, patch) => {
      if (!current) throw new Error('no sub');
      current = { ...current, ...patch, updatedAt: new Date() };
      return current;
    }),
    incrementAiCalls: vi.fn(),
  };
  return repo;
}

function makeUseCase(repo: SubscriptionRepository): GetSubscription {
  return new GetSubscription(repo, new EnsureSubscription(repo));
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
  it('creates a Free subscription on first read when none exists (self-heals legacy orgs)', async () => {
    const repo = makeRepo(null);
    const uc = makeUseCase(repo);

    const out = await uc.execute(99, new Date('2026-06-15T10:00:00.000Z'));

    expect(out.plan).toBe('free');
    expect(out.status).toBe('active');
    expect(out.organizationId).toBe(99);
    expect(out.aiCallsUsedThisPeriod).toBe(0);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('returns the subscription unchanged when the period is still active', async () => {
    const sub = makeSub();
    const repo = makeRepo(sub);
    const uc = makeUseCase(repo);

    const out = await uc.execute(42, new Date('2026-06-15T10:00:00.000Z'));

    expect(out.aiCallsUsedThisPeriod).toBe(25);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rolls the period and resets the counter when now is past currentPeriodEnd', async () => {
    const sub = makeSub();
    const repo = makeRepo(sub);
    const uc = makeUseCase(repo);

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
    const uc = makeUseCase(repo);

    const now = new Date('2026-07-05T12:00:00.000Z');
    await uc.execute(42, now);
    await uc.execute(42, new Date('2026-07-06T12:00:00.000Z'));

    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
