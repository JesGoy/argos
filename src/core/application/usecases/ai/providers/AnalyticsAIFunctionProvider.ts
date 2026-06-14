import { z } from 'zod';
import type { AIFunction } from '@/core/application/ports/AIService';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type { AnalyticsService } from '@/core/application/usecases/analytics/AnalyticsService';
import type { AIFunctionProvider } from '@/core/application/usecases/ai/types';
import type { Message } from '@/core/domain/entities/Message';
import { ANALYTICS_AI_ACTION } from '@/core/domain/constants/AnalyticsConstants';
import { REPORT_VIEWER_ROLES, SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';

export class AnalyticsAIFunctionProvider implements AIFunctionProvider {
  constructor(private readonly analytics: AnalyticsService) {}

  getSystemPromptSection(): string {
    return `## Análisis del negocio (solo lectura):
- Productos más/menos vendidos en un período (get_top_products).
- Tendencia diaria de ventas (get_sales_trend).
- Resumen de mermas: unidades, costo, tasa sobre ventas y desglose por categoría/producto (get_waste_summary).
- Riesgo de quiebre de stock: productos bajo punto de reorden o que se agotan pronto según su velocidad de venta (get_stockout_risk).
- Margen por producto (ingreso, costo, margen %) — solo para administradores y jefes de bodega (get_margin_by_product).
- Pronóstico de demanda de un producto por SKU (forecast_demand).
- Sugerencia de reposición: cuánto reponer para cubrir N días según el pronóstico y el stock actual (suggest_reorder). Devuelve solo una propuesta; para ejecutarla usa register_stock_in.
Usa estas herramientas para responder preguntas de negocio con cifras reales y recomendaciones. Puedes combinar varias en una misma respuesta. Para recomendar reposición, primero estima demanda/riesgo y luego propón cantidades; nunca registres stock sin que el usuario lo pida.`;
  }

  getFunctions(actor: ProductCommandActor, _history: Message[]): AIFunction[] {
    void _history;

    // Analytics covers sales/waste/inventory — for sales-authorized roles only.
    // Margin/cost is further gated to report viewers below.
    if (!SALES_AUTHORIZED_ROLES.includes(actor.role)) {
      return [];
    }
    const analyticsActor = { role: actor.role };

    const functions: AIFunction[] = [
      {
        name: ANALYTICS_AI_ACTION.GET_TOP_PRODUCTS,
        description:
          'Get the best- or worst-selling products by units over a period (completed sales).',
        parameters: z.object({
          days: z.number().int().positive().optional().describe('Look-back window in days (default 30)'),
          limit: z.number().int().positive().optional().describe('How many products to return (default 5)'),
          order: z
            .enum(['top', 'bottom'])
            .optional()
            .describe("'top' for best sellers (default), 'bottom' for worst sellers"),
        }),
        execute: async (params) =>
          this.analytics.getTopProducts(analyticsActor, {
            days: params.days ? Number(params.days) : undefined,
            limit: params.limit ? Number(params.limit) : undefined,
            order: params.order as 'top' | 'bottom' | undefined,
          }),
      },
      {
        name: ANALYTICS_AI_ACTION.GET_SALES_TREND,
        description: 'Get the daily sales trend (amount and count per day) over a period.',
        parameters: z.object({
          days: z.number().int().positive().optional().describe('Look-back window in days (default 30)'),
        }),
        execute: async (params) =>
          this.analytics.getSalesTrend(analyticsActor, {
            days: params.days ? Number(params.days) : undefined,
          }),
      },
      {
        name: ANALYTICS_AI_ACTION.GET_WASTE_SUMMARY,
        description:
          'Get the merma (waste) summary over a period: total units and cost, waste rate over sales, and breakdown by category and product.',
        parameters: z.object({
          days: z.number().int().positive().optional().describe('Look-back window in days (default 30)'),
        }),
        execute: async (params) =>
          this.analytics.getWasteSummary(analyticsActor, {
            days: params.days ? Number(params.days) : undefined,
          }),
      },
      {
        name: ANALYTICS_AI_ACTION.GET_STOCKOUT_RISK,
        description:
          'List products at risk of stocking out: at or below their reorder point, or running out soon given recent sales velocity (with estimated days of cover).',
        parameters: z.object({
          limit: z.number().int().positive().optional().describe('Max products to return (default 10)'),
        }),
        execute: async (params) =>
          this.analytics.getStockoutRisk(analyticsActor, {
            limit: params.limit ? Number(params.limit) : undefined,
          }),
      },
      {
        name: ANALYTICS_AI_ACTION.FORECAST_DEMAND,
        description:
          'Forecast demand for a product over a horizon using its recent daily sales (moving average + exponential smoothing). Returns projected units and current stock.',
        parameters: z.object({
          sku: z.string().describe('Product SKU to forecast'),
          horizonDays: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Days to project forward (default 7)'),
        }),
        execute: async (params) =>
          this.analytics.forecastDemand(analyticsActor, {
            sku: String(params.sku),
            horizonDays: params.horizonDays ? Number(params.horizonDays) : undefined,
          }),
      },
      {
        name: ANALYTICS_AI_ACTION.SUGGEST_REORDER,
        description:
          'Suggest how much stock to reorder so coverage lasts a number of days, based on demand forecast and current stock. Returns a PROPOSAL only — to actually receive stock, call register_stock_in (no confirmation needed). Omit sku to get suggestions across the catalog.',
        parameters: z.object({
          sku: z.string().optional().describe('Product SKU (omit for catalog-wide suggestions)'),
          coverageDays: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Days of stock the order should cover (default 14)'),
          limit: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Max suggestions when scanning the catalog (default 10)'),
        }),
        execute: async (params) =>
          this.analytics.suggestReorder(analyticsActor, {
            sku: params.sku ? String(params.sku) : undefined,
            coverageDays: params.coverageDays ? Number(params.coverageDays) : undefined,
            limit: params.limit ? Number(params.limit) : undefined,
          }),
      },
    ];

    // Cost/margin is restricted to report viewers (admin / warehouse manager).
    if (REPORT_VIEWER_ROLES.includes(actor.role)) {
      functions.push({
        name: ANALYTICS_AI_ACTION.GET_MARGIN_BY_PRODUCT,
        description:
          'Get revenue, cost and margin (with margin %) per product over a period. Restricted to managers.',
        parameters: z.object({
          days: z.number().int().positive().optional().describe('Look-back window in days (default 30)'),
          limit: z.number().int().positive().optional().describe('How many products to return (default 5)'),
        }),
        execute: async (params) =>
          this.analytics.getMarginByProduct(analyticsActor, {
            days: params.days ? Number(params.days) : undefined,
            limit: params.limit ? Number(params.limit) : undefined,
          }),
      });
    }

    return functions;
  }
}
