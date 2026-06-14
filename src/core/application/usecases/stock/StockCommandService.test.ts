import { describe, it, expect, vi } from 'vitest';
import { StockCommandService } from '@/core/application/usecases/stock/StockCommandService';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { TRANSACTION_TYPE, WASTE_REASON } from '@/core/domain/constants/StockConstants';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';
import { InsufficientStockError } from '@/core/domain/errors/POSErrors';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { Product } from '@/core/domain/entities/Product';
import type { StockTransaction } from '@/core/domain/entities/StockTransaction';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: 'CAFE-001',
    name: 'Café 250g',
    category: 'bebidas',
    unit: 'pcs',
    unitCost: 0,
    sellingPrice: 100,
    isComposite: false,
    minStock: 0,
    reorderPoint: 5,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeTx(overrides: Partial<StockTransaction> = {}): StockTransaction {
  return {
    id: 't1',
    productId: 'p1',
    type: TRANSACTION_TYPE.PURCHASE,
    quantity: 10,
    reason: 'test',
    userId: 1,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeStubs() {
  const products: ProductRepository = {
    findById: vi.fn(),
    findBySku: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    countLowStock: vi.fn(),
    countCategories: vi.fn(),
    findLowStock: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const stockTransactions: StockTransactionRepository = {
    findByProductId: vi.fn(),
    findBySaleId: vi.fn(),
    getCurrentStock: vi.fn(),
    getCurrentStockBatch: vi.fn(),
    findByDateRange: vi.fn(),
    create: vi.fn(),
    createBatch: vi.fn(),
    getWasteByProduct: vi.fn(),
    getWasteByCategory: vi.fn(),
  };
  return { products, stockTransactions };
}

const adminActor = StockCommandService.makeActor(1, USER_ROLE.ADMIN, PRODUCT_COMMAND_SOURCE.MANUAL);
const viewerActor = StockCommandService.makeActor(2, USER_ROLE.VIEWER, PRODUCT_COMMAND_SOURCE.MANUAL);

describe('StockCommandService', () => {
  describe('stockIn', () => {
    it('rejects viewers (RBAC)', async () => {
      const deps = makeStubs();
      const svc = new StockCommandService(deps);
      await expect(
        svc.stockIn(viewerActor, { sku: 'CAFE-001', quantity: 5 })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('throws ProductNotFoundError when SKU is unknown', async () => {
      const deps = makeStubs();
      (deps.products.findBySku as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const svc = new StockCommandService(deps);
      await expect(
        svc.stockIn(adminActor, { sku: 'NOPE', quantity: 5 })
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('updates Product.unitCost when perUnitCost is provided (last-cost)', async () => {
      const deps = makeStubs();
      const product = makeProduct({ unitCost: 500 });
      (deps.products.findBySku as ReturnType<typeof vi.fn>).mockResolvedValue(product);
      (deps.stockTransactions.create as ReturnType<typeof vi.fn>).mockResolvedValue(makeTx());

      const svc = new StockCommandService(deps);
      await svc.stockIn(adminActor, { sku: 'CAFE-001', quantity: 10, perUnitCost: 800 });

      expect(deps.products.update).toHaveBeenCalledWith('p1', { unitCost: 800 });
    });

    it('does NOT update unitCost when perUnitCost is zero or missing', async () => {
      const deps = makeStubs();
      (deps.products.findBySku as ReturnType<typeof vi.fn>).mockResolvedValue(makeProduct());
      (deps.stockTransactions.create as ReturnType<typeof vi.fn>).mockResolvedValue(makeTx());
      const svc = new StockCommandService(deps);

      await svc.stockIn(adminActor, { sku: 'CAFE-001', quantity: 10 });
      await svc.stockIn(adminActor, { sku: 'CAFE-001', quantity: 10, perUnitCost: 0 });

      expect(deps.products.update).not.toHaveBeenCalled();
    });
  });

  describe('recordWaste', () => {
    it('rejects viewers', async () => {
      const deps = makeStubs();
      const svc = new StockCommandService(deps);
      await expect(
        svc.recordWaste(viewerActor, { sku: 'CAFE-001', quantity: 1, category: WASTE_REASON.EXPIRED })
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('refuses when stock is insufficient', async () => {
      const deps = makeStubs();
      (deps.products.findBySku as ReturnType<typeof vi.fn>).mockResolvedValue(makeProduct());
      (deps.stockTransactions.getCurrentStock as ReturnType<typeof vi.fn>).mockResolvedValue(2);
      const svc = new StockCommandService(deps);

      await expect(
        svc.recordWaste(adminActor, { sku: 'CAFE-001', quantity: 5, category: WASTE_REASON.EXPIRED })
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });

    it('records a negative-quantity waste transaction with category', async () => {
      const deps = makeStubs();
      (deps.products.findBySku as ReturnType<typeof vi.fn>).mockResolvedValue(makeProduct());
      (deps.stockTransactions.getCurrentStock as ReturnType<typeof vi.fn>).mockResolvedValue(20);
      (deps.stockTransactions.create as ReturnType<typeof vi.fn>).mockImplementation(async (input) =>
        makeTx({ ...input, id: 't-waste' })
      );
      const svc = new StockCommandService(deps);

      const result = await svc.recordWaste(adminActor, {
        sku: 'CAFE-001',
        quantity: 3,
        category: WASTE_REASON.DAMAGED,
      });

      expect(deps.stockTransactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'p1',
          type: TRANSACTION_TYPE.WASTE,
          quantity: -3,
          wasteReason: WASTE_REASON.DAMAGED,
          userId: 1,
        })
      );
      expect(result.action).toBe('register_waste');
    });
  });
});
