import type { AIResultFormatter } from '@/core/application/usecases/ai/types';
import type {
  TopProductsResult,
  SalesTrendResult,
  WasteSummaryResult,
  StockoutRiskResult,
  MarginByProductResult,
  DemandForecastResult,
  SuggestReorderResult,
} from '@/core/application/usecases/analytics/AnalyticsService';
import { ANALYTICS_AI_ACTION } from '@/core/domain/constants/AnalyticsConstants';
import { WASTE_REASON_LABELS, type WasteReason } from '@/core/domain/constants/StockConstants';
import { formatMoney } from '@/config/money';
import { ORGANIZATION_DEFAULTS } from '@/core/domain/constants/OrganizationConstants';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';

/**
 * Deterministic fallback formatting for analytics results. With the multi-step
 * loop the model usually narrates these itself; this is the safety net for when
 * it returns no text.
 */
export class AnalyticsAIResponseFormatter implements AIResultFormatter {
  constructor(private readonly currency: string = ORGANIZATION_DEFAULTS.CURRENCY) {}

  private money(cents: number): string {
    return formatMoney(cents, this.currency);
  }

  supportsAction(action: string): boolean {
    return Object.values(ANALYTICS_AI_ACTION).includes(
      action as (typeof ANALYTICS_AI_ACTION)[keyof typeof ANALYTICS_AI_ACTION]
    );
  }

  async format(action: string, result: unknown): Promise<string> {
    switch (action) {
      case ANALYTICS_AI_ACTION.GET_TOP_PRODUCTS:
        return this.formatTopProducts(result as TopProductsResult);
      case ANALYTICS_AI_ACTION.GET_SALES_TREND:
        return this.formatSalesTrend(result as SalesTrendResult);
      case ANALYTICS_AI_ACTION.GET_WASTE_SUMMARY:
        return this.formatWasteSummary(result as WasteSummaryResult);
      case ANALYTICS_AI_ACTION.GET_STOCKOUT_RISK:
        return this.formatStockoutRisk(result as StockoutRiskResult);
      case ANALYTICS_AI_ACTION.GET_MARGIN_BY_PRODUCT:
        return this.formatMargin(result as MarginByProductResult);
      case ANALYTICS_AI_ACTION.FORECAST_DEMAND:
        return this.formatForecast(result as DemandForecastResult);
      case ANALYTICS_AI_ACTION.SUGGEST_REORDER:
        return this.formatReorder(result as SuggestReorderResult);
      default:
        return `${AI_RESPONSE_ICON.SALES} Análisis completado.`;
    }
  }

  private formatTopProducts(r: TopProductsResult): string {
    const title = r.order === 'bottom' ? 'Productos menos vendidos' : 'Productos más vendidos';
    if (r.products.length === 0) {
      return `📊 ${title} (${r.from} → ${r.to}): sin ventas en el período.`;
    }
    const lines = r.products.map(
      (p, i) =>
        `${i + 1}. ${p.productName} (${p.sku}): ${p.totalQuantity} uds · ${this.money(p.totalRevenue)}`
    );
    return `📊 ${title} (${r.from} → ${r.to}):\n${lines.join('\n')}`;
  }

  private formatSalesTrend(r: SalesTrendResult): string {
    if (r.points.length === 0) {
      return `📊 Sin ventas entre ${r.from} y ${r.to}.`;
    }
    const lines = r.points.map((p) => `• ${p.date}: ${this.money(p.totalAmount)} (${p.totalSales} ventas)`);
    return `📊 Tendencia de ventas (${r.from} → ${r.to})\nTotal: ${this.money(r.totalAmount)} en ${r.totalSales} ventas\n${lines.join('\n')}`;
  }

  private formatWasteSummary(r: WasteSummaryResult): string {
    const header = `📉 Mermas (${r.from} → ${r.to})\n• Total: ${r.totalUnits} uds · ${this.money(r.totalCostCents)}\n• Tasa sobre ventas: ${r.wasteRatePct}%`;
    if (r.byCategory.length === 0) {
      return `${header}\nSin mermas registradas en el período.`;
    }
    const categories = r.byCategory.map((c) => {
      const label = WASTE_REASON_LABELS[c.category as WasteReason] ?? c.category;
      return `  - ${label}: ${c.units} uds · ${this.money(c.costCents)}`;
    });
    const top = r.byProduct.slice(0, 5).map((p) => `  - ${p.productName} (${p.sku}): ${p.units} uds · ${this.money(p.costCents)}`);
    return `${header}\nPor categoría:\n${categories.join('\n')}\nPor producto:\n${top.join('\n')}`;
  }

  private formatStockoutRisk(r: StockoutRiskResult): string {
    if (r.items.length === 0) {
      return `${AI_RESPONSE_ICON.SUCCESS} Ningún producto en riesgo de quiebre de stock.`;
    }
    const lines = r.items.map((i) => {
      const cover = i.daysOfCover === null ? 'sin ventas recientes' : `~${i.daysOfCover} días de cobertura`;
      return `${AI_RESPONSE_ICON.WARNING} ${i.productName} (${i.sku}): ${i.currentStock} uds (reorden ${i.reorderPoint}) · ${cover}`;
    });
    return `📊 Riesgo de quiebre de stock (${r.items.length}):\n${lines.join('\n')}`;
  }

  private formatMargin(r: MarginByProductResult): string {
    if (r.products.length === 0) {
      return `📊 Sin datos de margen entre ${r.from} y ${r.to}.`;
    }
    const lines = r.products.map(
      (p) =>
        `• ${p.productName} (${p.sku}): ingreso ${this.money(p.totalRevenue)}, costo ${this.money(p.totalCost)}, margen ${this.money(p.margin)} (${p.marginPct}%)`
    );
    return `📊 Margen por producto (${r.from} → ${r.to})\nMargen total: ${this.money(r.totalMargin)} (${r.marginPct}%)\n${lines.join('\n')}`;
  }

  private formatForecast(r: DemandForecastResult): string {
    const cover =
      r.avgDailyDemand > 0
        ? `~${Math.floor(r.currentStock / r.avgDailyDemand)} días con el stock actual`
        : 'sin demanda reciente';
    return `📊 Pronóstico de ${r.productName} (${r.sku})\n• Demanda estimada: ${r.avgDailyDemand} uds/día\n• Proyección a ${r.horizonDays} días: ${r.forecastQuantity} uds\n• Stock actual: ${r.currentStock} uds (${cover})`;
  }

  private formatReorder(r: SuggestReorderResult): string {
    if (r.suggestions.length === 0) {
      return `${AI_RESPONSE_ICON.SUCCESS} No hay reposiciones sugeridas: el stock cubre la demanda proyectada (${r.coverageDays} días).`;
    }
    const lines = r.suggestions.map(
      (s) =>
        `• ${s.productName} (${s.sku}): reponer ${s.suggestedQuantity} uds (stock ${s.currentStock}, demanda ${s.avgDailyDemand}/día)`
    );
    return `📊 Sugerencia de reposición (cobertura ${r.coverageDays} días):\n${lines.join('\n')}\n\nPara registrar una entrada, dime "registra X unidades de SKU".`;
  }
}
