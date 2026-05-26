import type { AIResultFormatter } from '@/core/application/usecases/ai/types';
import { AI_ACTION, AI_RESPONSE_ICON } from '@/infra/ai/constants';
import type { SalesTodayAIResult } from '@/core/application/usecases/ai/providers/SalesAIFunctionProvider';

export class SalesAIResponseFormatter implements AIResultFormatter {
  supportsAction(action: string) {
    return action === AI_ACTION.GET_SALES_TODAY;
  }

  async format(action: string, result: unknown) {
    if (action !== AI_ACTION.GET_SALES_TODAY) {
      return AI_RESPONSE_ICON.SALES;
    }

    const salesResult = result as SalesTodayAIResult;
    return `${AI_RESPONSE_ICON.SALES} Ventas de hoy (${salesResult.date})\n• Total vendido: $${salesResult.totalAmount.toLocaleString()}\n• Número de ventas: ${salesResult.totalSales}\n• Ticket promedio: $${salesResult.averageTicket.toLocaleString()}`;
  }
}