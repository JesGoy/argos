import type { SaleItem, CreateSaleItemInput } from '@/core/domain/entities/SaleItem';

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
   * Create sale items in batch
   */
  createBatch(items: CreateSaleItemInput[]): Promise<SaleItem[]>;

  /**
   * Delete all items for a sale (for cancellation)
   */
  deleteBySaleId(saleId: string): Promise<void>;
}
