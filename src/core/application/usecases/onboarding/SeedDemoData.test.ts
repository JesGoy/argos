import { describe, it, expect, vi } from 'vitest';
import { SeedDemoData } from './SeedDemoData';
import { BUSINESS_TYPE } from '@/core/domain/constants/OrganizationConstants';
import { TRANSACTION_TYPE } from '@/core/domain/constants/StockConstants';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { Product } from '@/core/domain/entities/Product';

function makeDeps(opts: { existingSkus?: string[] } = {}) {
  const existing = new Set(opts.existingSkus ?? []);

  const products = {
    findById: vi.fn(),
    findBySku: vi
      .fn()
      .mockImplementation(async (sku: string) =>
        existing.has(sku) ? ({ id: `existing-${sku}`, sku } as Product) : null,
      ),
    findAll: vi.fn(),
    count: vi.fn(),
    countLowStock: vi.fn(),
    countCategories: vi.fn(),
    findLowStock: vi.fn(),
    create: vi.fn().mockImplementation(async (input) => ({
      id: `new-${input.sku}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    })),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  } satisfies ProductRepository;

  const stockTransactions = {
    findByProductId: vi.fn(),
    findBySaleId: vi.fn(),
    getCurrentStock: vi.fn(),
    getCurrentStockBatch: vi.fn(),
    findByDateRange: vi.fn(),
    create: vi.fn().mockResolvedValue({ id: 'tx1' }),
    createBatch: vi.fn(),
    getWasteByProduct: vi.fn(),
    getWasteByCategory: vi.fn(),
  } satisfies StockTransactionRepository;

  const uc = new SeedDemoData({ products, stockTransactions });
  return { uc, products, stockTransactions };
}

describe('SeedDemoData', () => {
  it('seeds the full food_service catalog with positive initial stock', async () => {
    const { uc, products, stockTransactions } = makeDeps();

    const result = await uc.execute({ businessType: BUSINESS_TYPE.FOOD_SERVICE, userId: 7 });

    expect(result.productsCreated).toBe(5);
    expect(result.skipped).toBe(0);
    expect(products.create).toHaveBeenCalledTimes(5);
    expect(stockTransactions.create).toHaveBeenCalledTimes(5);

    // Each seeded transaction is a stock-increasing purchase recorded for the actor.
    for (const call of stockTransactions.create.mock.calls) {
      expect(call[0]).toMatchObject({ type: TRANSACTION_TYPE.PURCHASE, userId: 7 });
      expect(call[0].quantity).toBeGreaterThan(0);
    }
    // Products are never created composite during seeding.
    for (const call of products.create.mock.calls) {
      expect(call[0].isComposite).toBe(false);
    }
  });

  it('seeds the retail catalog when businessType is retail', async () => {
    const { uc, products } = makeDeps();

    const result = await uc.execute({ businessType: BUSINESS_TYPE.RETAIL, userId: 1 });

    expect(result.productsCreated).toBe(5);
    const skus = products.create.mock.calls.map((c) => c[0].sku);
    expect(skus).toContain('CAM-001');
    expect(skus).not.toContain('CAFE-001');
  });

  it('is idempotent: existing demo SKUs are skipped, not duplicated', async () => {
    const { uc, products, stockTransactions } = makeDeps({
      existingSkus: ['CAFE-001', 'CAPP-001'],
    });

    const result = await uc.execute({ businessType: BUSINESS_TYPE.FOOD_SERVICE, userId: 7 });

    expect(result.skipped).toBe(2);
    expect(result.productsCreated).toBe(3);
    expect(products.create).toHaveBeenCalledTimes(3);
    expect(stockTransactions.create).toHaveBeenCalledTimes(3);
  });

  it('creates nothing when every demo SKU already exists', async () => {
    const { uc, products, stockTransactions } = makeDeps({
      existingSkus: ['CAFE-001', 'CAPP-001', 'CROIS-001', 'JUGO-001', 'SAND-001'],
    });

    const result = await uc.execute({ businessType: BUSINESS_TYPE.FOOD_SERVICE, userId: 7 });

    expect(result.productsCreated).toBe(0);
    expect(result.skipped).toBe(5);
    expect(products.create).not.toHaveBeenCalled();
    expect(stockTransactions.create).not.toHaveBeenCalled();
  });
});
