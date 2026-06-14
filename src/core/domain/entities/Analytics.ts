/**
 * Analytics Domain Entities
 * Aggregate shapes returned by repositories and assembled by AnalyticsService.
 * All monetary fields are integer cents.
 */

/** Sales rollup for one product over a window. */
export interface ProductSalesAggregate {
  productId: string;
  sku: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

/** Revenue/cost/margin rollup for one product over a window. */
export interface ProductMarginAggregate {
  productId: string;
  sku: string;
  productName: string;
  totalRevenue: number;
  totalCost: number;
  margin: number;
  /** Margin as a whole-number percentage of revenue (0-100). */
  marginPct: number;
}

/** Waste (merma) rollup for one product over a window. */
export interface WasteProductAggregate {
  productId: string;
  sku: string;
  productName: string;
  units: number;
  costCents: number;
}

/** Waste rollup by reason category over a window. */
export interface WasteCategoryAggregate {
  category: string;
  units: number;
  costCents: number;
}

/** One day of the sales trend series. */
export interface DailySalesPoint {
  date: string; // YYYY-MM-DD
  totalAmount: number;
  totalSales: number;
}

/** A product flagged as at risk of stocking out. */
export interface StockoutRiskItem {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  /** Units below the reorder point (0 if at/above it). */
  deficit: number;
  /** Estimated units sold per day over the velocity window. */
  dailyVelocity: number;
  /** currentStock / dailyVelocity, or null when velocity is 0. */
  daysOfCover: number | null;
}
