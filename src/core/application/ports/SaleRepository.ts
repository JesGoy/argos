import type { Sale, CreateSaleInput, UpdateSaleInput } from '@/core/domain/entities/Sale';
import type { SaleStatus } from '@/core/domain/constants/SaleConstants';
import type { DailySalesPoint } from '@/core/domain/entities/Analytics';

/**
 * Sale Repository Port
 * Contract for sale data access operations
 */
export interface SaleRepository {
  /**
   * Find a sale by its ID
   */
  findById(id: string): Promise<Sale | null>;

  /**
   * Find a sale by its sale number
   */
  findBySaleNumber(saleNumber: string): Promise<Sale | null>;

  /**
   * Find all sales with optional filters and pagination
   * @param filters Optional filters (date range, status, userId, customerId) and limit/offset
   */
  findAll(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: SaleStatus;
    userId?: number;
    customerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Sale[]>;

  /**
   * Count sales matching the given filters (ignores pagination).
   */
  count(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: SaleStatus;
    userId?: number;
    customerId?: string;
  }): Promise<number>;

  /**
   * Get today's sales statistics
   */
  getTodayStats(): Promise<{
    totalAmount: number;
    totalSales: number;
    averageTicket: number;
  }>;

  /**
   * Get sales statistics for a date range
   */
  getDateRangeStats(startDate: Date, endDate: Date): Promise<{
    totalAmount: number;
    totalSales: number;
    averageTicket: number;
    byPaymentMethod: Record<string, number>;
  }>;

  /**
   * Create a new sale. Pass `executor` to run inside a transaction.
   */
  create(input: CreateSaleInput, executor?: unknown): Promise<Sale>;

  /**
   * Update an existing sale
   */
  update(id: string, input: UpdateSaleInput): Promise<void>;

  /**
   * Cancel a sale. Pass `executor` to run inside a transaction.
   */
  cancel(id: string, executor?: unknown): Promise<void>;

  /**
   * Generate next sale number
   */
  generateSaleNumber(): Promise<string>;

  /**
   * Daily sales series over a window (completed sales only), ordered by day.
   * Aggregated in SQL with date_trunc.
   */
  getDailySalesTrend(startDate: Date, endDate: Date): Promise<DailySalesPoint[]>;
}
