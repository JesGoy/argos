import type { Sale } from '@/core/domain/entities/Sale';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type { SaleStatus } from '@/core/domain/constants/SaleConstants';

export interface SaleWithItems extends Sale {
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface SalesReportFilters {
  startDate?: Date;
  endDate?: Date;
  status?: SaleStatus;
  userId?: number;
  customerId?: string;
}

/**
 * Use Case: Get Sales Report
 * Retrieves sales with filtering and statistics
 */
export class GetSalesReport {
  constructor(
    private readonly deps: {
      sales: SaleRepository;
      saleItems: SaleItemRepository;
    }
  ) {}

  async execute(filters?: SalesReportFilters): Promise<{
    sales: SaleWithItems[];
    stats: {
      totalAmount: number;
      totalSales: number;
      averageTicket: number;
      byPaymentMethod?: Record<string, number>;
    };
  }> {
    // Get sales with filters
    const sales = await this.deps.sales.findAll(filters);

    // Get items for each sale
    const salesWithItems: SaleWithItems[] = await Promise.all(
      sales.map(async (sale) => {
        const items = await this.deps.saleItems.findBySaleId(sale.id);
        return {
          ...sale,
          items: items.map((item) => ({
            id: item.id,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        };
      })
    );

    // Calculate statistics
    let stats;
    if (filters?.startDate && filters?.endDate) {
      stats = await this.deps.sales.getDateRangeStats(filters.startDate, filters.endDate);
    } else {
      stats = await this.deps.sales.getTodayStats();
    }

    return {
      sales: salesWithItems,
      stats,
    };
  }
}
