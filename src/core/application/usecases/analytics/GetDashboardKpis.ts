import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { AnalyticsActor, AnalyticsService } from '@/core/application/usecases/analytics/AnalyticsService';
import type {
  ProductSalesAggregate,
  StockoutRiskItem,
  DailySalesPoint,
} from '@/core/domain/entities/Analytics';
import { ANALYTICS_DEFAULTS } from '@/core/domain/constants/AnalyticsConstants';

export interface DashboardKpis {
  today: {
    totalAmount: number;
    totalSales: number;
    averageTicket: number;
  };
  period: {
    from: string;
    to: string;
    days: number;
    totalAmount: number;
    totalSales: number;
    averageTicket: number;
  };
  margin: {
    totalRevenue: number;
    totalCost: number;
    totalMargin: number;
    marginPct: number;
  };
  waste: {
    totalUnits: number;
    totalCostCents: number;
    wasteRatePct: number;
  };
  topProducts: ProductSalesAggregate[];
  stockoutRisk: StockoutRiskItem[];
  salesTrend: DailySalesPoint[];
}

/**
 * Consolidated KPIs for the dashboard. Aggregation is on-the-fly via
 * AnalyticsService (no time-series tables yet). Margin/cost is exposed, so the
 * caller must restrict the page to report viewers.
 */
export class GetDashboardKpis {
  constructor(
    private readonly deps: {
      analytics: AnalyticsService;
      sales: SaleRepository;
    }
  ) {}

  async execute(actor: AnalyticsActor, opts: { days?: number } = {}): Promise<DashboardKpis> {
    const days = opts.days ?? ANALYTICS_DEFAULTS.WINDOW_DAYS;

    const [today, trend, margin, waste, top, risk] = await Promise.all([
      this.deps.sales.getTodayStats(),
      this.deps.analytics.getSalesTrend(actor, { days }),
      this.deps.analytics.getMarginByProduct(actor, { days, limit: 5 }),
      this.deps.analytics.getWasteSummary(actor, { days }),
      this.deps.analytics.getTopProducts(actor, { days, limit: 5 }),
      this.deps.analytics.getStockoutRisk(actor, { limit: 8 }),
    ]);

    const periodAverageTicket =
      trend.totalSales > 0 ? Math.round(trend.totalAmount / trend.totalSales) : 0;

    return {
      today: {
        totalAmount: today.totalAmount,
        totalSales: today.totalSales,
        averageTicket: Math.round(today.averageTicket),
      },
      period: {
        from: trend.from,
        to: trend.to,
        days,
        totalAmount: trend.totalAmount,
        totalSales: trend.totalSales,
        averageTicket: periodAverageTicket,
      },
      margin: {
        totalRevenue: margin.totalRevenue,
        totalCost: margin.totalCost,
        totalMargin: margin.totalMargin,
        marginPct: margin.marginPct,
      },
      waste: {
        totalUnits: waste.totalUnits,
        totalCostCents: waste.totalCostCents,
        wasteRatePct: waste.wasteRatePct,
      },
      topProducts: top.products,
      stockoutRisk: risk.items,
      salesTrend: trend.points,
    };
  }
}
