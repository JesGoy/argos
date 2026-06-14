import type { StockTransaction, CreateStockTransactionInput } from '@/core/domain/entities/StockTransaction';
import type {
  WasteProductAggregate,
  WasteCategoryAggregate,
} from '@/core/domain/entities/Analytics';

/**
 * StockTransaction Repository Port
 * Contract for stock transaction data access operations
 */
export interface StockTransactionRepository {
  /**
   * Find all transactions for a specific product
   */
  findByProductId(productId: string): Promise<StockTransaction[]>;

  /**
   * Find all transactions for a specific sale
   */
  findBySaleId(saleId: string): Promise<StockTransaction[]>;

  /**
   * Get current stock for a product
   * Calculates from all transactions
   */
  getCurrentStock(productId: string): Promise<number>;

  /**
   * Get current stock for multiple products
   */
  getCurrentStockBatch(productIds: string[]): Promise<Record<string, number>>;

  /**
   * Get stock movements for a date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<StockTransaction[]>;

  /**
   * Create a new stock transaction. Pass `executor` to run inside a transaction.
   */
  create(input: CreateStockTransactionInput, executor?: unknown): Promise<StockTransaction>;

  /**
   * Create multiple stock transactions in batch. Pass `executor` to run inside a transaction.
   */
  createBatch(inputs: CreateStockTransactionInput[], executor?: unknown): Promise<StockTransaction[]>;

  /**
   * Waste (merma) rollup by product over a window — units lost and their cost
   * (units × current unitCost). Aggregated in SQL.
   */
  getWasteByProduct(startDate: Date, endDate: Date): Promise<WasteProductAggregate[]>;

  /**
   * Waste (merma) rollup by reason category over a window.
   */
  getWasteByCategory(startDate: Date, endDate: Date): Promise<WasteCategoryAggregate[]>;
}
