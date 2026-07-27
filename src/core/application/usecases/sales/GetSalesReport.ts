import type { Sale } from '@/core/domain/entities/Sale';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type { DteDocumentRepository } from '@/core/application/ports/DteDocumentRepository';
import type { SaleStatus } from '@/core/domain/constants/SaleConstants';
import type { DteStatus } from '@/core/domain/constants/DteConstants';
import { DTE_TYPE } from '@/core/domain/constants/DteConstants';

export interface SaleWithItems extends Sale {
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  /** Boleta status for this sale, or `null` if the org doesn't use DTE. */
  dte: { id: string; status: DteStatus; folio?: number } | null;
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
      dteDocuments: DteDocumentRepository;
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

    // Same batching approach as items above: one query for the whole page's
    // boleta summaries, then a per-sale lookup (no N+1).
    const dteBySale = new Map<string, SaleWithItems['dte']>();
    const dteSummaries = await this.deps.dteDocuments.findSummariesBySaleIds(
      sales.map((sale) => sale.id),
      DTE_TYPE.BOLETA_AFECTA
    );
    for (const summary of dteSummaries) {
      dteBySale.set(summary.saleId, { id: summary.id, status: summary.status, folio: summary.folio });
    }

    const salesWithItems: SaleWithItems[] = sales.map((sale) => ({
      ...sale,
      items: itemsBySale.get(sale.id) ?? [],
      dte: dteBySale.get(sale.id) ?? null,
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
