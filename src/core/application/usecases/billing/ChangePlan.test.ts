import { describe, it, expect, vi } from 'vitest';
import { ChangePlan } from './ChangePlan';
import { GetSubscription } from './GetSubscription';
import {
  PlanLimitExceededError,
  SubscriptionNotFoundError,
} from '@/core/domain/errors/BillingErrors';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import type { SessionData } from '@/core/application/ports/SessionService';
import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { Subscription } from '@/core/domain/entities/Subscription';
import type { PlanType } from '@/core/domain/constants/BillingConstants';

function makeSession(role: SessionData['role']): SessionData {
  return {
    userId: 'user-1',
    organizationId: 42,
    username: 'admin',
    email: 'admin@test.cl',
    role,
  };
}

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    organizationId: 42,
    plan: 'pro',
    status: 'active',
    currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
    aiCallsUsedThisPeriod: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeDeps(opts: {
  sub: Subscription;
  userCount?: number;
  productCount?: number;
}) {
  const subs: SubscriptionRepository = {
    findByOrganizationId: vi.fn().mockResolvedValue(opts.sub),
    create: vi.fn(),
    update: vi
      .fn()
      .mockImplementation(async (_orgId: number, patch: Partial<Subscription>) => ({
        ...opts.sub,
        ...patch,
        updatedAt: new Date(),
      })),
    incrementAiCalls: vi.fn(),
  };

  const users: UserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    findByOrganization: vi
      .fn()
      .mockResolvedValue(Array.from({ length: opts.userCount ?? 1 }, (_, i) => ({ id: String(i) }))),
    create: vi.fn(),
    update: vi.fn(),
  };

  const products: ProductRepository = {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn().mockResolvedValue(opts.productCount ?? 0),
    countLowStock: vi.fn(),
    countCategories: vi.fn(),
    findLowStock: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };

  const getSubscription = new GetSubscription(subs);
  const uc = new ChangePlan(subs, getSubscription, users, products);
  return { uc, subs, users, products };
}

describe('ChangePlan', () => {
  it('rejects non-admin callers with UnauthorizedError', async () => {
    const { uc, subs } = makeDeps({ sub: makeSub({ plan: 'free' }) });

    await expect(
      uc.execute({ session: makeSession(USER_ROLE.VIEWER), targetPlan: 'pro' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(subs.update).not.toHaveBeenCalled();
  });

  it('returns current subscription unchanged when targetPlan equals current plan', async () => {
    const sub = makeSub({ plan: 'pro' });
    const { uc, subs } = makeDeps({ sub });

    const out = await uc.execute({ session: makeSession(USER_ROLE.ADMIN), targetPlan: 'pro' });

    expect(out).toBe(sub);
    expect(subs.update).not.toHaveBeenCalled();
  });

  it('upgrades Free -> Pro for admin', async () => {
    const sub = makeSub({ plan: 'free' });
    const { uc, subs } = makeDeps({ sub, userCount: 1, productCount: 10 });

    const out = await uc.execute({ session: makeSession(USER_ROLE.ADMIN), targetPlan: 'pro' });

    expect(out.plan).toBe('pro');
    expect(subs.update).toHaveBeenCalledWith(42, { plan: 'pro' });
  });

  it('throws PlanLimitExceededError with limitType "products" when downgrading Pro -> Free with 100 products', async () => {
    const sub = makeSub({ plan: 'pro' });
    const { uc, subs } = makeDeps({ sub, userCount: 1, productCount: 100 });

    try {
      await uc.execute({ session: makeSession(USER_ROLE.ADMIN), targetPlan: 'free' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PlanLimitExceededError);
      const e = err as PlanLimitExceededError;
      expect(e.limitType).toBe('products');
      expect(e.current).toBe(100);
      expect(e.max).toBe(50);
      expect(e.plan).toBe<PlanType>('free');
    }

    expect(subs.update).not.toHaveBeenCalled();
  });

  it('throws PlanLimitExceededError with limitType "users" when downgrading Pro -> Free with 3 users', async () => {
    const sub = makeSub({ plan: 'pro' });
    const { uc, subs } = makeDeps({ sub, userCount: 3, productCount: 0 });

    await expect(
      uc.execute({ session: makeSession(USER_ROLE.ADMIN), targetPlan: 'free' }),
    ).rejects.toMatchObject({
      name: 'PlanLimitExceededError',
      limitType: 'users',
      current: 3,
      max: 1,
      plan: 'free',
    });

    expect(subs.update).not.toHaveBeenCalled();
  });

  it('allows downgrade Business -> Pro when current usage fits the Pro caps', async () => {
    const sub = makeSub({ plan: 'business', aiCallsUsedThisPeriod: 50 });
    const { uc, subs } = makeDeps({ sub, userCount: 4, productCount: 200 });

    const out = await uc.execute({ session: makeSession(USER_ROLE.ADMIN), targetPlan: 'pro' });

    expect(out.plan).toBe('pro');
    expect(subs.update).toHaveBeenCalledWith(42, { plan: 'pro' });
  });

  it('propagates SubscriptionNotFoundError from GetSubscription', async () => {
    const subs: SubscriptionRepository = {
      findByOrganizationId: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      incrementAiCalls: vi.fn(),
    };
    const users = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      findByOrganization: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as UserRepository;
    const products = {
      count: vi.fn().mockResolvedValue(0),
    } as unknown as ProductRepository;

    const uc = new ChangePlan(subs, new GetSubscription(subs), users, products);

    await expect(
      uc.execute({ session: makeSession(USER_ROLE.ADMIN), targetPlan: 'pro' }),
    ).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });
});
