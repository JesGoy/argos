import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';
import { StockTransactionRepositoryDrizzle } from '@/infra/repositories/StockTransactionRepositoryDrizzle';
import { SeedDemoData } from '@/core/application/usecases/onboarding/SeedDemoData';

/**
 * Org-scoped: pass the session's organizationId so seeded products and stock
 * transactions land in the right tenant.
 */
export function makeSeedDemoData(organizationId: number): SeedDemoData {
  return new SeedDemoData({
    products: new ProductRepositoryDrizzle(organizationId),
    stockTransactions: new StockTransactionRepositoryDrizzle(organizationId),
  });
}
