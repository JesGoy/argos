import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { CreateProductInput } from '@/core/domain/entities/Product';
import type { BusinessType } from '@/core/domain/constants/OrganizationConstants';
import { BUSINESS_TYPE } from '@/core/domain/constants/OrganizationConstants';
import { TRANSACTION_TYPE } from '@/core/domain/constants/StockConstants';

/**
 * A demo product plus the initial on-hand quantity to seed for it. Monetary
 * fields are integer cents, matching the rest of the domain.
 */
interface DemoProduct extends CreateProductInput {
  initialStock: number;
}

/**
 * Curated sample catalogs per business type. Kept small (a handful of items)
 * so a new org gets a usable, realistic starting point without clutter.
 * Prices/costs are in cents.
 */
const DEMO_PRODUCTS: Record<BusinessType, DemoProduct[]> = {
  [BUSINESS_TYPE.FOOD_SERVICE]: [
    base('CAFE-001', 'Café americano', 'Bebidas', 30000, 180000, 100, 10, 20),
    base('CAPP-001', 'Cappuccino', 'Bebidas', 45000, 250000, 80, 10, 20),
    base('CROIS-001', 'Croissant', 'Pastelería', 50000, 150000, 40, 5, 12),
    base('JUGO-001', 'Jugo natural', 'Bebidas', 60000, 200000, 30, 5, 10),
    base('SAND-001', 'Sándwich de jamón y queso', 'Comida', 120000, 350000, 20, 3, 8),
  ],
  [BUSINESS_TYPE.RETAIL]: [
    base('CAM-001', 'Camiseta básica', 'Vestuario', 350000, 990000, 50, 5, 15),
    base('PANT-001', 'Pantalón', 'Vestuario', 800000, 1990000, 30, 3, 10),
    base('ZAP-001', 'Zapatillas', 'Calzado', 1500000, 3990000, 20, 2, 6),
    base('GOR-001', 'Gorro', 'Accesorios', 150000, 590000, 40, 5, 12),
    base('MOCH-001', 'Mochila', 'Accesorios', 900000, 2490000, 15, 2, 5),
  ],
};

function base(
  sku: string,
  name: string,
  category: string,
  unitCost: number,
  sellingPrice: number,
  initialStock: number,
  minStock: number,
  reorderPoint: number,
): DemoProduct {
  return {
    sku,
    name,
    description: 'Producto de ejemplo (puedes editarlo o eliminarlo).',
    category,
    unit: 'pcs',
    unitCost,
    sellingPrice,
    isComposite: false,
    minStock,
    reorderPoint,
    initialStock,
  };
}

export interface SeedDemoDataDeps {
  products: ProductRepository;
  stockTransactions: StockTransactionRepository;
}

export interface SeedDemoDataInput {
  businessType: BusinessType;
  /** Actor user id, recorded on the seeded stock transactions. */
  userId: number;
}

export interface SeedDemoDataResult {
  productsCreated: number;
  /** Demo SKUs that already existed and were left untouched (idempotency). */
  skipped: number;
}

/**
 * Use Case: SeedDemoData
 * Populates a new org with a small, realistic catalog (and matching starting
 * stock) so the dashboard, POS and analytics have something to show during
 * onboarding. Idempotent: a demo SKU that already exists is skipped, so running
 * it twice never duplicates rows. Seeds straight through the org-scoped repos —
 * it is a controlled fixture, not user-driven creation, so it intentionally
 * bypasses plan-limit enforcement (the sets are far below any cap).
 */
export class SeedDemoData {
  constructor(private readonly deps: SeedDemoDataDeps) {}

  async execute(input: SeedDemoDataInput): Promise<SeedDemoDataResult> {
    const blueprint = DEMO_PRODUCTS[input.businessType];
    let productsCreated = 0;
    let skipped = 0;

    for (const demo of blueprint) {
      const existing = await this.deps.products.findBySku(demo.sku);
      if (existing) {
        skipped++;
        continue;
      }

      const { initialStock, ...productInput } = demo;
      const product = await this.deps.products.create(productInput);

      if (initialStock > 0) {
        await this.deps.stockTransactions.create({
          productId: product.id,
          type: TRANSACTION_TYPE.PURCHASE,
          quantity: initialStock,
          reason: 'Inventario inicial (datos de ejemplo)',
          userId: input.userId,
          perUnitCost: demo.unitCost,
        });
      }

      productsCreated++;
    }

    return { productsCreated, skipped };
  }
}
