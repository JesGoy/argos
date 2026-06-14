import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type {
  ProductSalesAggregate,
  ProductMarginAggregate,
  WasteProductAggregate,
  WasteCategoryAggregate,
  DailySalesPoint,
  StockoutRiskItem,
} from '@/core/domain/entities/Analytics';
import { ANALYTICS_DEFAULTS } from '@/core/domain/constants/AnalyticsConstants';
import {
  REPORT_VIEWER_ROLES,
  SALES_AUTHORIZED_ROLES,
  type UserRole,
} from '@/core/domain/constants/UserConstants';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';
import type { Product } from '@/core/domain/entities/Product';
import {
  forecastDemand as computeForecast,
  buildDailySeries,
} from '@/core/application/usecases/analytics/forecast';

export interface AnalyticsActor {
  role: UserRole;
}

export interface TopProductsResult {
  from: string;
  to: string;
  order: 'top' | 'bottom';
  products: ProductSalesAggregate[];
}

export interface SalesTrendResult {
  from: string;
  to: string;
  totalAmount: number;
  totalSales: number;
  points: DailySalesPoint[];
}

export interface WasteSummaryResult {
  from: string;
  to: string;
  totalUnits: number;
  totalCostCents: number;
  salesRevenueCents: number;
  /** Waste cost as a whole-number percentage of sales revenue in the window. */
  wasteRatePct: number;
  byProduct: WasteProductAggregate[];
  byCategory: WasteCategoryAggregate[];
}

export interface StockoutRiskResult {
  windowDays: number;
  items: StockoutRiskItem[];
}

export interface MarginByProductResult {
  from: string;
  to: string;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginPct: number;
  products: ProductMarginAggregate[];
}

export interface DemandForecastResult {
  sku: string;
  productName: string;
  from: string;
  to: string;
  horizonDays: number;
  avgDailyDemand: number;
  movingAverage: number;
  exponentialSmoothing: number;
  forecastQuantity: number;
  currentStock: number;
}

export interface ReorderSuggestion {
  sku: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  avgDailyDemand: number;
  coverageDays: number;
  forecastQuantity: number;
  /** Units to order so stock covers the forecast plus a reorder-point buffer. */
  suggestedQuantity: number;
}

export interface SuggestReorderResult {
  coverageDays: number;
  suggestions: ReorderSuggestion[];
}

/**
 * Read-only analytics over sales, waste and inventory. Aggregation happens in
 * SQL (the repositories); this service composes the higher-level shapes and
 * enforces role visibility (cost/margin is restricted to report viewers).
 */
export class AnalyticsService {
  constructor(
    private readonly deps: {
      sales: SaleRepository;
      saleItems: SaleItemRepository;
      stockTransactions: StockTransactionRepository;
      products: ProductRepository;
    }
  ) {}

  async getTopProducts(
    actor: AnalyticsActor,
    input: { days?: number; limit?: number; order?: 'top' | 'bottom' } = {}
  ): Promise<TopProductsResult> {
    this.assertCanView(actor.role);
    const { startDate, endDate } = this.window(input.days);
    const order = input.order ?? 'top';
    const limit = input.limit ?? ANALYTICS_DEFAULTS.TOP_LIMIT;

    const products = await this.deps.saleItems.getTopProducts({ startDate, endDate, limit, order });

    return { from: this.iso(startDate), to: this.iso(endDate), order, products };
  }

  async getSalesTrend(
    actor: AnalyticsActor,
    input: { days?: number } = {}
  ): Promise<SalesTrendResult> {
    this.assertCanView(actor.role);
    const { startDate, endDate } = this.window(input.days);

    const points = await this.deps.sales.getDailySalesTrend(startDate, endDate);
    const totalAmount = points.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalSales = points.reduce((sum, p) => sum + p.totalSales, 0);

    return { from: this.iso(startDate), to: this.iso(endDate), totalAmount, totalSales, points };
  }

  async getWasteSummary(
    actor: AnalyticsActor,
    input: { days?: number } = {}
  ): Promise<WasteSummaryResult> {
    this.assertCanView(actor.role);
    const { startDate, endDate } = this.window(input.days);

    const [byProduct, byCategory, salesStats] = await Promise.all([
      this.deps.stockTransactions.getWasteByProduct(startDate, endDate),
      this.deps.stockTransactions.getWasteByCategory(startDate, endDate),
      this.deps.sales.getDateRangeStats(startDate, endDate),
    ]);

    const totalUnits = byProduct.reduce((sum, p) => sum + p.units, 0);
    const totalCostCents = byProduct.reduce((sum, p) => sum + p.costCents, 0);
    const salesRevenueCents = salesStats.totalAmount;
    const wasteRatePct =
      salesRevenueCents > 0 ? Math.round((totalCostCents / salesRevenueCents) * 100) : 0;

    return {
      from: this.iso(startDate),
      to: this.iso(endDate),
      totalUnits,
      totalCostCents,
      salesRevenueCents,
      wasteRatePct,
      byProduct,
      byCategory,
    };
  }

  async getStockoutRisk(
    actor: AnalyticsActor,
    input: { limit?: number } = {}
  ): Promise<StockoutRiskResult> {
    this.assertCanView(actor.role);
    const limit = input.limit ?? ANALYTICS_DEFAULTS.STOCKOUT_LIMIT;
    const windowDays = ANALYTICS_DEFAULTS.VELOCITY_WINDOW_DAYS;
    const { startDate, endDate } = this.window(windowDays);

    // Composite (finished-good) products carry no stock of their own — their
    // availability is bounded by ingredient stock — so exclude them here.
    const products = (await this.deps.products.findAll()).filter((p) => !p.isComposite);
    const productIds = products.map((p) => p.id);

    const [stockMap, soldMap] = await Promise.all([
      this.deps.stockTransactions.getCurrentStockBatch(productIds),
      this.deps.saleItems.getQuantitySoldByProduct(productIds, startDate, endDate),
    ]);

    const items: StockoutRiskItem[] = products
      .map((product) => {
        const currentStock = stockMap[product.id] ?? 0;
        const sold = soldMap[product.id] ?? 0;
        const dailyVelocity = sold / windowDays;
        const daysOfCover = dailyVelocity > 0 ? currentStock / dailyVelocity : null;
        const deficit = Math.max(0, product.reorderPoint - currentStock);

        return {
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          currentStock,
          reorderPoint: product.reorderPoint,
          deficit,
          dailyVelocity: Math.round(dailyVelocity * 100) / 100,
          daysOfCover: daysOfCover === null ? null : Math.round(daysOfCover * 10) / 10,
        };
      })
      // At risk: at/below reorder point, or running out within the threshold.
      .filter(
        (item) =>
          item.currentStock <= item.reorderPoint ||
          (item.daysOfCover !== null &&
            item.daysOfCover <= ANALYTICS_DEFAULTS.STOCKOUT_DAYS_OF_COVER_THRESHOLD)
      )
      .sort((a, b) => {
        // Soonest to run out first; products with no velocity sink to the bottom.
        const aCover = a.daysOfCover ?? Number.POSITIVE_INFINITY;
        const bCover = b.daysOfCover ?? Number.POSITIVE_INFINITY;
        return aCover - bCover;
      })
      .slice(0, limit);

    return { windowDays, items };
  }

  async getMarginByProduct(
    actor: AnalyticsActor,
    input: { days?: number; limit?: number } = {}
  ): Promise<MarginByProductResult> {
    this.assertCanViewReports(actor.role);
    const { startDate, endDate } = this.window(input.days);
    const limit = input.limit ?? ANALYTICS_DEFAULTS.TOP_LIMIT;

    const products = await this.deps.saleItems.getMarginByProduct({ startDate, endDate, limit });
    const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalCost = products.reduce((sum, p) => sum + p.totalCost, 0);
    const totalMargin = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;

    return {
      from: this.iso(startDate),
      to: this.iso(endDate),
      totalRevenue,
      totalCost,
      totalMargin,
      marginPct,
      products,
    };
  }

  async forecastDemand(
    actor: AnalyticsActor,
    input: { sku: string; horizonDays?: number }
  ): Promise<DemandForecastResult> {
    this.assertCanView(actor.role);

    const product = await this.deps.products.findBySku(input.sku);
    if (!product) throw new ProductNotFoundError(input.sku);

    const horizonDays = input.horizonDays ?? ANALYTICS_DEFAULTS.FORECAST_HORIZON_DAYS;
    const { startDate, endDate } = this.window(ANALYTICS_DEFAULTS.FORECAST_LOOKBACK_DAYS);

    const rows = await this.deps.saleItems.getDailyQuantityByProduct(product.id, startDate, endDate);
    const series = buildDailySeries(rows, startDate, endDate);
    const forecast = computeForecast(series, horizonDays);
    const currentStock = await this.deps.stockTransactions.getCurrentStock(product.id);

    return {
      sku: product.sku,
      productName: product.name,
      from: this.iso(startDate),
      to: this.iso(endDate),
      horizonDays,
      avgDailyDemand: forecast.avgDailyDemand,
      movingAverage: forecast.movingAverage,
      exponentialSmoothing: forecast.exponentialSmoothing,
      forecastQuantity: forecast.forecastQuantity,
      currentStock,
    };
  }

  /**
   * Propose reorder quantities. Returns suggestions only — executing a reorder
   * goes through register_stock_in (which the user confirms). For a single SKU
   * it uses the richer daily-series forecast; for the whole catalog it uses a
   * flat velocity estimate (one query) to stay cheap.
   */
  async suggestReorder(
    actor: AnalyticsActor,
    input: { sku?: string; coverageDays?: number; limit?: number } = {}
  ): Promise<SuggestReorderResult> {
    this.assertCanView(actor.role);
    const coverageDays = input.coverageDays ?? ANALYTICS_DEFAULTS.REORDER_COVERAGE_DAYS;

    if (input.sku) {
      const product = await this.deps.products.findBySku(input.sku);
      if (!product) throw new ProductNotFoundError(input.sku);
      if (product.isComposite) {
        // A finished good isn't reordered directly — its ingredients are.
        return { coverageDays, suggestions: [] };
      }
      const suggestion = await this.buildSuggestionFromSeries(product, coverageDays);
      return { coverageDays, suggestions: [suggestion] };
    }

    const products = (await this.deps.products.findAll()).filter((p) => !p.isComposite);
    const ids = products.map((p) => p.id);
    const { startDate, endDate } = this.window(ANALYTICS_DEFAULTS.VELOCITY_WINDOW_DAYS);

    const [stockMap, soldMap] = await Promise.all([
      this.deps.stockTransactions.getCurrentStockBatch(ids),
      this.deps.saleItems.getQuantitySoldByProduct(ids, startDate, endDate),
    ]);

    const suggestions = products
      .map((product) => {
        const currentStock = stockMap[product.id] ?? 0;
        const avgDailyDemand = (soldMap[product.id] ?? 0) / ANALYTICS_DEFAULTS.VELOCITY_WINDOW_DAYS;
        const forecastQuantity = Math.ceil(avgDailyDemand * coverageDays);
        const targetStock = forecastQuantity + product.reorderPoint;
        const suggestedQuantity = Math.max(0, targetStock - currentStock);

        return {
          sku: product.sku,
          productName: product.name,
          currentStock,
          reorderPoint: product.reorderPoint,
          avgDailyDemand: Math.round(avgDailyDemand * 100) / 100,
          coverageDays,
          forecastQuantity,
          suggestedQuantity,
        };
      })
      .filter((s) => s.suggestedQuantity > 0)
      .sort((a, b) => b.suggestedQuantity - a.suggestedQuantity)
      .slice(0, input.limit ?? ANALYTICS_DEFAULTS.STOCKOUT_LIMIT);

    return { coverageDays, suggestions };
  }

  private async buildSuggestionFromSeries(
    product: Product,
    coverageDays: number
  ): Promise<ReorderSuggestion> {
    const { startDate, endDate } = this.window(ANALYTICS_DEFAULTS.FORECAST_LOOKBACK_DAYS);
    const rows = await this.deps.saleItems.getDailyQuantityByProduct(product.id, startDate, endDate);
    const series = buildDailySeries(rows, startDate, endDate);
    const forecast = computeForecast(series, coverageDays);
    const currentStock = await this.deps.stockTransactions.getCurrentStock(product.id);
    const targetStock = forecast.forecastQuantity + product.reorderPoint;

    return {
      sku: product.sku,
      productName: product.name,
      currentStock,
      reorderPoint: product.reorderPoint,
      avgDailyDemand: forecast.avgDailyDemand,
      coverageDays,
      forecastQuantity: forecast.forecastQuantity,
      suggestedQuantity: Math.max(0, targetStock - currentStock),
    };
  }

  private window(days: number = ANALYTICS_DEFAULTS.WINDOW_DAYS): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }

  private iso(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private assertCanView(role: UserRole): void {
    if (!SALES_AUTHORIZED_ROLES.includes(role)) {
      throw new UnauthorizedError(`El rol '${role}' no tiene permisos para ver analíticas`);
    }
  }

  private assertCanViewReports(role: UserRole): void {
    if (!REPORT_VIEWER_ROLES.includes(role)) {
      throw new UnauthorizedError(
        `El rol '${role}' no tiene permisos para ver costos y márgenes`
      );
    }
  }
}
