import type { Sale, CreateSaleInput, UpdateSaleInput } from '@/core/domain/entities/Sale';
import type { SaleStatus } from '@/core/domain/constants/SaleConstants';

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
   * Find all sales with optional filters
   * @param filters Optional filters (date range, status, userId, customerId)
   */
  findAll(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: SaleStatus;
    userId?: number;
    customerId?: string;
  }): Promise<Sale[]>;

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
   * Create a new sale
   */
  create(input: CreateSaleInput): Promise<Sale>;

  /**
   * Update an existing sale
   */
  update(id: string, input: UpdateSaleInput): Promise<void>;

  /**
   * Cancel a sale
   */
  cancel(id: string): Promise<void>;

  /**
   * Generate next sale number
   */
  generateSaleNumber(): Promise<string>;
}
