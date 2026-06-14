import { describe, it, expect, vi } from 'vitest';
import { ProductCommandService } from './ProductCommandService';
import { PlanLimitExceededError } from '@/core/domain/errors/BillingErrors';
import { EnforcePlanLimit } from '@/core/application/usecases/billing/EnforcePlanLimit';
import {
  PRODUCT_COMMAND_SOURCE,
} from '@/core/domain/constants/ProductConstants';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { GetSubscription } from '@/core/application/usecases/billing/GetSubscription';
import type { Subscription } from '@/core/domain/entities/Subscription';
import type { CreateProductInput } from '@/core/domain/entities/Product';

function makeSub(plan: Subscription['plan'] = 'free'): Subscription {
  return {
    id: 1,
    organizationId: 42,
    plan,
    status: 'active',
    currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
    aiCallsUsedThisPeriod: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };
}

function makeService(opts: {
  productCount: number;
  plan?: Subscription['plan'];
}) {
  const products = {
    findById: vi.fn(),
    findBySku: vi.fn().mockResolvedValue(null),
    findAll: vi.fn(),
    count: vi.fn().mockResolvedValue(opts.productCount),
    countLowStock: vi.fn(),
    countCategories: vi.fn(),
    findLowStock: vi.fn(),
    create: vi.fn().mockImplementation(async (input) => ({
      id: 'p1',
      ...input,
      createdAt: new Date(),
    })),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  } satisfies ProductRepository;

  const stockTransactions = {} as unknown as StockTransactionRepository;

  const getSubscription = {
    execute: vi.fn().mockResolvedValue(makeSub(opts.plan ?? 'free')),
  } as unknown as GetSubscription;

  const enforcePlanLimit = new EnforcePlanLimit();

  const service = new ProductCommandService({
    products,
    stockTransactions,
    organizationId: 42,
    getSubscription,
    enforcePlanLimit,
  });

  return { service, products, getSubscription };
}

const validInput: CreateProductInput = {
  sku: 'PROD-001',
  name: 'Test Product',
  description: '',
  category: 'General',
  unit: 'unit',
  unitCost: 100,
  sellingPrice: 200,
  minStock: 0,
  reorderPoint: 0,
  isComposite: false,
};

const actor = {
  userId: 'u1',
  role: USER_ROLE.ADMIN,
  source: PRODUCT_COMMAND_SOURCE.MANUAL,
};

describe('ProductCommandService.create — plan limit enforcement', () => {
  it('rejects createProduct when product count equals the Free plan cap (50)', async () => {
    const { service, products } = makeService({ productCount: 50, plan: 'free' });

    await expect(service.create(actor, validInput)).rejects.toMatchObject({
      name: 'PlanLimitExceededError',
      limitType: 'products',
      current: 50,
      max: 50,
      plan: 'free',
    });

    expect(products.create).not.toHaveBeenCalled();
  });

  it('allows createProduct when one slot remains under the Free plan cap', async () => {
    const { service, products } = makeService({ productCount: 49, plan: 'free' });

    const result = await service.create(actor, validInput);

    expect(result.data.sku).toBe('PROD-001');
    expect(products.create).toHaveBeenCalledTimes(1);
  });

  it('allows createProduct on Business plan regardless of count', async () => {
    const { service, products } = makeService({ productCount: 1_000_000, plan: 'business' });

    await expect(service.create(actor, validInput)).resolves.toBeDefined();
    expect(products.create).toHaveBeenCalledTimes(1);
  });

  it('throws PlanLimitExceededError instance (not just shape match) at cap', async () => {
    const { service } = makeService({ productCount: 50, plan: 'free' });
    await expect(service.create(actor, validInput)).rejects.toBeInstanceOf(
      PlanLimitExceededError,
    );
  });
});
