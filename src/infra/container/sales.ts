import { SaleRepositoryDrizzle } from '@/infra/repositories/SaleRepositoryDrizzle';
import { SaleItemRepositoryDrizzle } from '@/infra/repositories/SaleItemRepositoryDrizzle';
import { StockTransactionRepositoryDrizzle } from '@/infra/repositories/StockTransactionRepositoryDrizzle';
import { CustomerRepositoryDrizzle } from '@/infra/repositories/CustomerRepositoryDrizzle';
import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';
import { RecipeRepositoryDrizzle } from '@/infra/repositories/RecipeRepositoryDrizzle';
import { TransactionRunnerDrizzle } from '@/infra/repositories/TransactionRunnerDrizzle';
import { ProcessSale } from '@/core/application/usecases/sales/ProcessSale';
import { GetSalesReport } from '@/core/application/usecases/sales/GetSalesReport';
import { AdjustStock } from '@/core/application/usecases/sales/AdjustStock';
import { GetProductStock } from '@/core/application/usecases/sales/GetProductStock';
import { GetSaleById } from '@/core/application/usecases/sales/GetSaleById';
import { CancelSale } from '@/core/application/usecases/sales/CancelSale';
import { SalesCommandService } from '@/core/application/usecases/sales/SalesCommandService';

/**
 * All factories are scoped to an organization: pass the session's
 * organizationId so every repository query is tenant-isolated.
 */

export function makeProcessSale(organizationId: number) {
  const sales = new SaleRepositoryDrizzle(organizationId);
  const saleItems = new SaleItemRepositoryDrizzle(organizationId);
  const products = new ProductRepositoryDrizzle(organizationId);
  const stockTransactions = new StockTransactionRepositoryDrizzle(organizationId);
  const customers = new CustomerRepositoryDrizzle(organizationId);

  return new ProcessSale({
    sales,
    saleItems,
    products,
    stockTransactions,
    customers,
    recipes: new RecipeRepositoryDrizzle(organizationId),
    transaction: new TransactionRunnerDrizzle(),
  });
}

export function makeGetSalesReport(organizationId: number) {
  const sales = new SaleRepositoryDrizzle(organizationId);
  const saleItems = new SaleItemRepositoryDrizzle(organizationId);

  return new GetSalesReport({ sales, saleItems });
}

export function makeAdjustStock(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  const stockTransactions = new StockTransactionRepositoryDrizzle(organizationId);

  return new AdjustStock({ products, stockTransactions });
}

export function makeGetProductStock(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  const stockTransactions = new StockTransactionRepositoryDrizzle(organizationId);

  return new GetProductStock({ products, stockTransactions });
}

export function makeGetSaleById(organizationId: number) {
  const sales = new SaleRepositoryDrizzle(organizationId);
  const saleItems = new SaleItemRepositoryDrizzle(organizationId);

  return new GetSaleById({ sales, saleItems });
}

export function makeCancelSale(organizationId: number) {
  const sales = new SaleRepositoryDrizzle(organizationId);
  const saleItems = new SaleItemRepositoryDrizzle(organizationId);
  const stockTransactions = new StockTransactionRepositoryDrizzle(organizationId);

  return new CancelSale({
    sales,
    saleItems,
    stockTransactions,
    transaction: new TransactionRunnerDrizzle(),
  });
}

/**
 * Shared command service for sale mutations (manual + AI converge here).
 */
export function makeSalesCommandService(organizationId: number): SalesCommandService {
  return new SalesCommandService({
    processSale: makeProcessSale(organizationId),
    cancelSale: makeCancelSale(organizationId),
  });
}
