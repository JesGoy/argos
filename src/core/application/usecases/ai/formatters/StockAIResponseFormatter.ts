import type { AIResultFormatter } from '@/core/application/usecases/ai/types';
import type { StockTransaction } from '@/core/domain/entities/StockTransaction';
import { STOCK_AI_ACTION } from '@/core/domain/constants/StockConstants';
import { TRANSACTION_TYPE_LABELS } from '@/core/domain/constants/StockConstants';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';

interface StockTransactionResult {
  action: string;
  data: StockTransaction;
  refreshPaths: readonly string[];
}

interface StockHistoryResult {
  action: string;
  data: StockTransaction[];
  refreshPaths: readonly string[];
}

interface StockOutPendingResult {
  requiresConfirmation: boolean;
  confirmation: {
    action: string;
    sku: string;
    productName: string;
    quantity: number;
    reason: string;
  };
}

export class StockAIResponseFormatter implements AIResultFormatter {
  supportsAction(action: string): boolean {
    return Object.values(STOCK_AI_ACTION).includes(action as (typeof STOCK_AI_ACTION)[keyof typeof STOCK_AI_ACTION]);
  }

  async format(action: string, result: unknown): Promise<string> {
    if (action === STOCK_AI_ACTION.STOCK_OUT) {
      const pending = result as StockOutPendingResult;
      if (pending?.requiresConfirmation && pending.confirmation) {
        const c = pending.confirmation;
        return `${AI_RESPONSE_ICON.WARNING} Necesito confirmación antes de registrar la salida de stock:\n\n• Producto: ${c.productName} (${c.sku})\n• Cantidad a reducir: ${c.quantity} unidades\n• Motivo: ${c.reason}\n\nEsta operación reducirá el stock disponible. ¿Confirmas? (sí / no)`;
      }
    }

    if (action === STOCK_AI_ACTION.STOCK_IN) {
      const res = result as StockTransactionResult;
      if (res?.data) {
        const t = res.data;
        return `${AI_RESPONSE_ICON.SUCCESS} Entrada de stock registrada:\n\n• Tipo: ${TRANSACTION_TYPE_LABELS[t.type] ?? t.type}\n• Cantidad: +${t.quantity} unidades\n• Motivo: ${t.reason ?? '—'}\n• Fecha: ${new Date(t.createdAt).toLocaleString('es')}`;
      }
    }

    if (action === STOCK_AI_ACTION.GET_HISTORY) {
      const res = result as StockHistoryResult;
      if (!res?.data || res.data.length === 0) {
        return `${AI_RESPONSE_ICON.PRODUCT} No hay movimientos de stock registrados para este producto.`;
      }
      const lines = res.data.slice(0, 10).map((t) => {
        const sign = t.quantity >= 0 ? '+' : '';
        return `• ${new Date(t.createdAt).toLocaleDateString('es')} | ${TRANSACTION_TYPE_LABELS[t.type] ?? t.type} | ${sign}${t.quantity} uds${t.reason ? ` | ${t.reason}` : ''}`;
      });
      return `${AI_RESPONSE_ICON.PRODUCT} Últimos movimientos de stock:\n\n${lines.join('\n')}`;
    }

    return `${AI_RESPONSE_ICON.SUCCESS} Operación de stock completada.`;
  }
}
