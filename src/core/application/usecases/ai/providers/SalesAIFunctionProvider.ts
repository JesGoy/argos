import { z } from 'zod';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { AIFunctionProvider } from '@/core/application/usecases/ai/types';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type { Message } from '@/core/domain/entities/Message';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { AI_ACTION } from '@/infra/ai/constants';

export interface SalesTodayAIResult {
  date: string;
  totalAmount: number;
  totalSales: number;
  averageTicket: number;
}

export interface SalesRangeAIResult {
  from: string;
  to: string;
  totalAmount: number;
  totalSales: number;
  averageTicket: number;
  byPaymentMethod: Record<string, number>;
}

export interface SalesListAIResult {
  total: number;
  sales: Array<{
    id: string;
    saleNumber: string;
    totalAmount: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
  }>;
}

export const SALES_AI_ACTION = {
  GET_TODAY: AI_ACTION.GET_SALES_TODAY,
  GET_BY_PERIOD: 'get_sales_by_period',
  GET_RECENT: 'get_recent_sales',
} as const;

export class SalesAIFunctionProvider implements AIFunctionProvider {
  constructor(private readonly sales: SaleRepository) {}

  getSystemPromptSection(): string {
    return `## Consultas de ventas:
- Ver estadísticas del día actual (total vendido, número de ventas, ticket promedio).
- Consultar ventas por rango de fechas con desglose por método de pago.
- Listar ventas recientes con filtro opcional por estado (pending, completed, cancelled).`;
  }

  getFunctions(actor: ProductCommandActor, _history: Message[]) {
    void _history;

    // Sales data is for sales-authorized roles; viewers don't get these tools.
    if (!SALES_AUTHORIZED_ROLES.includes(actor.role)) {
      return [];
    }

    return [
      {
        name: SALES_AI_ACTION.GET_TODAY,
        description:
          "Get today's sales statistics including total amount, number of sales, and average ticket.",
        parameters: z.object({}),
        execute: async () => {
          const stats = await this.sales.getTodayStats();
          return {
            date: new Date().toISOString().split('T')[0],
            totalAmount: stats.totalAmount,
            totalSales: stats.totalSales,
            averageTicket: Math.round(stats.averageTicket),
          } satisfies SalesTodayAIResult;
        },
      },
      {
        name: SALES_AI_ACTION.GET_BY_PERIOD,
        description:
          'Get sales statistics for a date range. Includes totals by payment method.',
        parameters: z.object({
          from: z.string().describe('Start date in YYYY-MM-DD format'),
          to: z.string().describe('End date in YYYY-MM-DD format'),
        }),
        execute: async (params: Record<string, unknown>) => {
          const from = new Date(String(params.from));
          const to = new Date(String(params.to));
          to.setHours(23, 59, 59, 999);

          const stats = await this.sales.getDateRangeStats(from, to);
          return {
            from: String(params.from),
            to: String(params.to),
            totalAmount: stats.totalAmount,
            totalSales: stats.totalSales,
            averageTicket: Math.round(stats.averageTicket),
            byPaymentMethod: stats.byPaymentMethod,
          } satisfies SalesRangeAIResult;
        },
      },
      {
        name: SALES_AI_ACTION.GET_RECENT,
        description:
          'Get the list of recent sales (last 10), optionally filtered by status.',
        parameters: z.object({
          status: z
            .enum(['pending', 'completed', 'cancelled'])
            .optional()
            .describe('Filter by sale status (optional)'),
        }),
        execute: async (params: Record<string, unknown>) => {
          const sales = await this.sales.findAll(
            params.status ? { status: params.status as 'pending' | 'completed' | 'cancelled' } : undefined
          );
          const recent = sales.slice(0, 10);
          return {
            total: recent.length,
            sales: recent.map((s) => ({
              id: String(s.id),
              saleNumber: s.saleNumber,
              totalAmount: s.totalAmount,
              status: s.status,
              paymentMethod: s.paymentMethod,
              createdAt: s.createdAt.toISOString(),
            })),
          } satisfies SalesListAIResult;
        },
      },
    ];
  }
}
