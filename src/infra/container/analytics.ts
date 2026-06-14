import { AnalyticsService } from '@/core/application/usecases/analytics/AnalyticsService';
import { GetDashboardKpis } from '@/core/application/usecases/analytics/GetDashboardKpis';
import { SaleRepositoryDrizzle } from '@/infra/repositories/SaleRepositoryDrizzle';
import { SaleItemRepositoryDrizzle } from '@/infra/repositories/SaleItemRepositoryDrizzle';
import { StockTransactionRepositoryDrizzle } from '@/infra/repositories/StockTransactionRepositoryDrizzle';
import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';

/**
 * Analytics composition root (all org-scoped, read-only).
 */
export function makeAnalyticsService(organizationId: number): AnalyticsService {
  return new AnalyticsService({
    sales: new SaleRepositoryDrizzle(organizationId),
    saleItems: new SaleItemRepositoryDrizzle(organizationId),
    stockTransactions: new StockTransactionRepositoryDrizzle(organizationId),
    products: new ProductRepositoryDrizzle(organizationId),
  });
}

export function makeGetDashboardKpis(organizationId: number): GetDashboardKpis {
  return new GetDashboardKpis({
    analytics: makeAnalyticsService(organizationId),
    sales: new SaleRepositoryDrizzle(organizationId),
  });
}
