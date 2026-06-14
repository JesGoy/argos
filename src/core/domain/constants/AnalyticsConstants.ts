/**
 * Analytics Domain Constants
 * Tool identifiers and default windows for the analytic agent.
 */

export const ANALYTICS_AI_ACTION = {
  GET_TOP_PRODUCTS: 'get_top_products' as const,
  GET_SALES_TREND: 'get_sales_trend' as const,
  GET_WASTE_SUMMARY: 'get_waste_summary' as const,
  GET_STOCKOUT_RISK: 'get_stockout_risk' as const,
  GET_MARGIN_BY_PRODUCT: 'get_margin_by_product' as const,
  FORECAST_DEMAND: 'forecast_demand' as const,
  SUGGEST_REORDER: 'suggest_reorder' as const,
} as const;

export type AnalyticsAIAction =
  (typeof ANALYTICS_AI_ACTION)[keyof typeof ANALYTICS_AI_ACTION];

export const ANALYTICS_DEFAULTS = {
  /** Default look-back window for trend/top/waste/margin queries. */
  WINDOW_DAYS: 30,
  /** Default number of rows for top-N style queries. */
  TOP_LIMIT: 5,
  /** Default number of rows for stockout-risk queries. */
  STOCKOUT_LIMIT: 10,
  /** Items with fewer days of cover than this are flagged at risk. */
  STOCKOUT_DAYS_OF_COVER_THRESHOLD: 7,
  /** Window used to estimate daily sales velocity for stockout risk. */
  VELOCITY_WINDOW_DAYS: 14,
  /** Default forecast horizon (days projected forward). */
  FORECAST_HORIZON_DAYS: 7,
  /** Look-back window feeding the daily demand series for forecasting. */
  FORECAST_LOOKBACK_DAYS: 30,
  /** Days of stock a reorder suggestion aims to cover. */
  REORDER_COVERAGE_DAYS: 14,
} as const;
