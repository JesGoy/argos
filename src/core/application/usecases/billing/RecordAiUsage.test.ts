import { describe, it, expect, vi } from 'vitest';
import { RecordAiUsage } from './RecordAiUsage';
import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { Subscription } from '@/core/domain/entities/Subscription';

function makeSub(aiCalls: number): Subscription {
  return {
    id: 1,
    organizationId: 42,
    plan: 'free',
    status: 'active',
    currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
    aiCallsUsedThisPeriod: aiCalls,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };
}

function makeRepo() {
  return {
    findByOrganizationId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    incrementAiCalls: vi
      .fn()
      .mockImplementation(async (_orgId: number, delta: number) => makeSub(5 + delta)),
  } satisfies SubscriptionRepository;
}

describe('RecordAiUsage', () => {
  it('increments by 1 by default and passes the organizationId through', async () => {
    const repo = makeRepo();
    const uc = new RecordAiUsage(repo);

    const out = await uc.execute(42);

    expect(repo.incrementAiCalls).toHaveBeenCalledTimes(1);
    expect(repo.incrementAiCalls).toHaveBeenCalledWith(42, 1);
    expect(out.aiCallsUsedThisPeriod).toBe(6);
  });

  it('passes an explicit delta through to the atomic repo increment', async () => {
    const repo = makeRepo();
    const uc = new RecordAiUsage(repo);

    await uc.execute(42, 3);

    expect(repo.incrementAiCalls).toHaveBeenCalledWith(42, 3);
  });

  it('returns whatever the repository returns', async () => {
    const repo = makeRepo();
    const expected = makeSub(99);
    (repo.incrementAiCalls as ReturnType<typeof vi.fn>).mockResolvedValue(expected);
    const uc = new RecordAiUsage(repo);

    await expect(uc.execute(42)).resolves.toBe(expected);
  });
});
