import type { AIResultFormatter } from '@/core/application/usecases/ai/types';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';
import { formatMoney } from '@/config/money';
import { ORGANIZATION_DEFAULTS } from '@/core/domain/constants/OrganizationConstants';
import {
  SALES_AI_ACTION,
  type SalesTodayAIResult,
  type SalesRangeAIResult,
  type SalesListAIResult,
} from '@/core/application/usecases/ai/providers/SalesAIFunctionProvider';
import { SALE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/core/domain/constants/SaleConstants';

export class SalesAIResponseFormatter implements AIResultFormatter {
  constructor(private readonly currency: string = ORGANIZATION_DEFAULTS.CURRENCY) {}

  private money(cents: number): string {
    return formatMoney(cents, this.currency);
  }

  supportsAction(action: string) {
    return Object.values(SALES_AI_ACTION).includes(
      action as (typeof SALES_AI_ACTION)[keyof typeof SALES_AI_ACTION]
    );
  }

  async format(action: string, result: unknown) {
    if (action === SALES_AI_ACTION.GET_TODAY) {
      const r = result as SalesTodayAIResult;
      return `${AI_RESPONSE_ICON.SALES} Ventas de hoy (${r.date})\n• Total vendido: ${this.money(r.totalAmount)}\n• Número de ventas: ${r.totalSales}\n• Ticket promedio: ${this.money(Math.round(r.averageTicket))}`;
    }

    if (action === SALES_AI_ACTION.GET_BY_PERIOD) {
      const r = result as SalesRangeAIResult;
      const byMethod = Object.entries(r.byPaymentMethod);
      const methodLines = byMethod.length
        ? byMethod
            .map(([method, amount]) => `  - ${PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method}: ${this.money(amount)}`)
            .join('\n')
        : '  - Sin ventas en el período';
      return `${AI_RESPONSE_ICON.SALES} Ventas del ${r.from} al ${r.to}\n• Total vendido: ${this.money(r.totalAmount)}\n• Número de ventas: ${r.totalSales}\n• Ticket promedio: ${this.money(Math.round(r.averageTicket))}\nPor método de pago:\n${methodLines}`;
    }

    if (action === SALES_AI_ACTION.GET_RECENT) {
      const r = result as SalesListAIResult;
      if (r.total === 0) {
        return `${AI_RESPONSE_ICON.SALES} No hay ventas recientes que coincidan.`;
      }
      const lines = r.sales.map((s) => {
        const date = new Date(s.createdAt).toLocaleDateString('es');
        const status = SALE_STATUS_LABELS[s.status as keyof typeof SALE_STATUS_LABELS] ?? s.status;
        return `• ${s.saleNumber} | ${date} | ${this.money(s.totalAmount)} | ${status}`;
      });
      return `${AI_RESPONSE_ICON.SALES} Ventas recientes (${r.total}):\n${lines.join('\n')}`;
    }

    return AI_RESPONSE_ICON.SALES;
  }
}
