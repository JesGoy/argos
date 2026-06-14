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
  limit?: number;
  offset?: number;
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
    total: number;
    stats: {
      totalAmount: number;
      totalSales: number;
      averageTicket: number;
      byPaymentMethod?: Record<string, number>;
    };
  }> {
    // Get the (possibly paginated) page of sales.
    const sales = await this.deps.sales.findAll(filters);

    // Fetch all items for this page in ONE query, then group by sale (no N+1).
    const itemsBySale = new Map<string, SaleWithItems['items']>();
    const allItems = await this.deps.saleItems.findBySaleIds(sales.map((sale) => sale.id));
    for (const item of allItems) {
      const bucket = itemsBySale.get(item.saleId) ?? [];
      bucket.push({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      });
      itemsBySale.set(item.saleId, bucket);
    }

    const salesWithItems: SaleWithItems[] = sales.map((sale) => ({
      ...sale,
      items: itemsBySale.get(sale.id) ?? [],
    }));

    // Calculate statistics
    let stats;
    if (filters?.startDate && filters?.endDate) {
      stats = await this.deps.sales.getDateRangeStats(filters.startDate, filters.endDate);
    } else {
      stats = await this.deps.sales.getTodayStats();
    }

    // Total matching rows (for pagination), ignoring limit/offset.
    const total = await this.deps.sales.count(filters);

    return {
      sales: salesWithItems,
      total,
      stats,
    };
  }
}
