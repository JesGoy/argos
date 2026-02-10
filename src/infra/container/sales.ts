import { SaleRepositoryDrizzle } from '@/infra/repositories/SaleRepositoryDrizzle';
import { SaleItemRepositoryDrizzle } from '@/infra/repositories/SaleItemRepositoryDrizzle';
import { StockTransactionRepositoryDrizzle } from '@/infra/repositories/StockTransactionRepositoryDrizzle';
import { CustomerRepositoryDrizzle } from '@/infra/repositories/CustomerRepositoryDrizzle';
import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';
import { ProcessSale } from '@/core/application/usecases/sales/ProcessSale';
import { GetSalesReport } from '@/core/application/usecases/sales/GetSalesReport';
import { AdjustStock } from '@/core/application/usecases/sales/AdjustStock';
import { GetProductStock } from '@/core/application/usecases/sales/GetProductStock';
import { GetSaleById } from '@/core/application/usecases/sales/GetSaleById';
import { CancelSale } from '@/core/application/usecases/sales/CancelSale';

/**
 * Factory: Process Sale Use Case
 */
export function makeProcessSale() {
  const sales = new SaleRepositoryDrizzle();
  const saleItems = new SaleItemRepositoryDrizzle();
  const products = new ProductRepositoryDrizzle();
  const stockTransactions = new StockTransactionRepositoryDrizzle();
  const customers = new CustomerRepositoryDrizzle();
  
  return new ProcessSale({
    sales,
    saleItems,
    products,
    stockTransactions,
    customers,
  });
}

/**
 * Factory: Get Sales Report Use Case
 */
export function makeGetSalesReport() {
  const sales = new SaleRepositoryDrizzle();
  const saleItems = new SaleItemRepositoryDrizzle();
  
  return new GetSalesReport({ sales, saleItems });
}

/**
 * Factory: Adjust Stock Use Case
 */
export function makeAdjustStock() {
  const products = new ProductRepositoryDrizzle();
  const stockTransactions = new StockTransactionRepositoryDrizzle();
  
  return new AdjustStock({ products, stockTransactions });
}

/**
 * Factory: Get Product Stock Use Case
 */
export function makeGetProductStock() {
  const products = new ProductRepositoryDrizzle();
  const stockTransactions = new StockTransactionRepositoryDrizzle();
  
  return new GetProductStock({ products, stockTransactions });
}

/**
 * Factory: Get Sale By ID Use Case
 */
export function makeGetSaleById() {
  const sales = new SaleRepositoryDrizzle();
  const saleItems = new SaleItemRepositoryDrizzle();
  
  return new GetSaleById({ sales, saleItems });
}

/**
 * Factory: Cancel Sale Use Case
 */
export function makeCancelSale() {
  const sales = new SaleRepositoryDrizzle();
  const saleItems = new SaleItemRepositoryDrizzle();
  const stockTransactions = new StockTransactionRepositoryDrizzle();
  
  return new CancelSale({ sales, saleItems, stockTransactions });
}
