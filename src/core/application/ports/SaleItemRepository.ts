import type { SaleItem, CreateSaleItemInput } from '@/core/domain/entities/SaleItem';
import type {
  ProductSalesAggregate,
  ProductMarginAggregate,
} from '@/core/domain/entities/Analytics';

/**
 * SaleItem Repository Port
 * Contract for sale item data access operations
 */
export interface SaleItemRepository {
  /**
   * Find all items for a specific sale
   */
  findBySaleId(saleId: string): Promise<SaleItem[]>;

  /**
   * Find all items for several sales in one query (avoids N+1 in reports).
   */
  findBySaleIds(saleIds: string[]): Promise<SaleItem[]>;

  /**
   * Create sale items in batch. Pass `executor` to run inside a transaction.
   */
  createBatch(items: CreateSaleItemInput[], executor?: unknown): Promise<SaleItem[]>;

  /**
   * Delete all items for a sale (for cancellation)
   */
  deleteBySaleId(saleId: string): Promise<void>;

  /**
   * Top/bottom selling products by units over a window (completed sales only).
   * Aggregated in SQL — does not load rows into JS.
   */
  getTopProducts(opts: {
    startDate: Date;
    endDate: Date;
    limit: number;
    order: 'top' | 'bottom';
  }): Promise<ProductSalesAggregate[]>;

  /**
   * Revenue, cost and margin per product over a window (completed sales only).
   * Cost uses the product's current unitCost (last-cost approximation for MVP).
   */
  getMarginByProduct(opts: {
    startDate: Date;
    endDate: Date;
    limit: number;
  }): Promise<ProductMarginAggregate[]>;

  /**
   * Units sold per product id over a window (completed sales only).
   * Returns a map keyed by every requested id (0 when none sold).
   */
  getQuantitySoldByProduct(
    productIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, number>>;

  /**
   * Daily units sold for one product over a window (completed sales only),
   * ordered by day. Sparse — days without sales are omitted. Feeds forecasting.
   */
  getDailyQuantityByProduct(
    productId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; quantity: number }>>;
}
