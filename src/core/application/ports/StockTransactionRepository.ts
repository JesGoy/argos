import type { StockTransaction, CreateStockTransactionInput } from '@/core/domain/entities/StockTransaction';

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
   * Create a new stock transaction
   */
  create(input: CreateStockTransactionInput): Promise<StockTransaction>;

  /**
   * Create multiple stock transactions in batch
   */
  createBatch(inputs: CreateStockTransactionInput[]): Promise<StockTransaction[]>;
}
