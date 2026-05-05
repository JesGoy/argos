import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { AIFunctionProvider } from '@/core/application/usecases/ai/types';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type { Message } from '@/core/domain/entities/Message';
import { AI_ACTION } from '@/infra/ai/constants';

export interface SalesTodayAIResult {
  date: string;
  totalAmount: number;
  totalSales: number;
  averageTicket: number;
}

export class SalesAIFunctionProvider implements AIFunctionProvider {
  constructor(private readonly sales: SaleRepository) {}

  getFunctions(actor: ProductCommandActor, history: Message[]) {
    void actor;
    void history;

    return [
      {
        name: AI_ACTION.GET_SALES_TODAY,
        description:
          'Get today\'s sales statistics including total amount, number of sales, and average ticket.',
        parameters: {},
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
    ];
  }
}