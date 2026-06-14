import { z } from 'zod';
import type { AIFunction } from '@/core/application/ports/AIService';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type {
  StockCommandService,
  StockOutConfirmation,
  WasteConfirmation,
} from '@/core/application/usecases/stock/StockCommandService';
import type { AIFunctionProvider } from '@/core/application/usecases/ai/types';
import type { Message } from '@/core/domain/entities/Message';
import { STOCK_AI_ACTION, WASTE_REASONS } from '@/core/domain/constants/StockConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';

export class StockAIFunctionProvider implements AIFunctionProvider {
  constructor(private readonly stockCommands: StockCommandService) {}

  getSystemPromptSection(): string {
    return `## Gestión de stock:
- Registrar entradas de stock (compras/recepciones) para un producto por SKU. No requiere confirmación.
- Registrar salidas de stock (ajustes/pérdidas). Requiere confirmación explícita del usuario antes de ejecutar.
- Registrar mermas (waste): producto perdido/desechado, con categoría (vencido, dañado, pérdida en preparación, robo, otro). Requiere confirmación explícita.
- Consultar el historial de movimientos de stock de un producto (últimos 20 movimientos).`;
  }

  getFunctions(actor: ProductCommandActor, _history: Message[]): AIFunction[] {
    void _history;
    const stockActor = {
      userId: Number(actor.userId),
      role: actor.role,
      source: PRODUCT_COMMAND_SOURCE.AI,
    };
    const canManageStock = SALES_AUTHORIZED_ROLES.includes(actor.role);

    const allFunctions: AIFunction[] = [
      {
        name: STOCK_AI_ACTION.STOCK_IN,
        description:
          'Register an incoming stock entry (purchase/receipt) for a product. Increases the available stock. Does not require confirmation.',
        parameters: z.object({
          sku: z.string().describe('Product SKU to receive stock for'),
          quantity: z.number().int().positive().describe('Number of units received (must be positive)'),
          reason: z.string().optional().describe('Reason or description for this stock entry (e.g., "Compra a proveedor X")'),
          referenceNumber: z.string().optional().describe('Reference number (purchase order, invoice, etc.)'),
        }),
        execute: async (params) => {
          return this.stockCommands.stockIn(stockActor, {
            sku: String(params.sku),
            quantity: Number(params.quantity),
            reason: params.reason ? String(params.reason) : undefined,
            referenceNumber: params.referenceNumber ? String(params.referenceNumber) : undefined,
          });
        },
      },
      {
        name: STOCK_AI_ACTION.STOCK_OUT,
        description:
          'Register an outgoing stock adjustment (reduction) for a product. Decreases the available stock. Requires explicit user confirmation before executing.',
        parameters: z.object({
          sku: z.string().describe('Product SKU to reduce stock for'),
          quantity: z.number().int().positive().describe('Number of units to remove (must be positive)'),
          reason: z.string().optional().describe('Reason for the stock reduction (e.g., "Pérdida", "Ajuste de inventario")'),
        }),
        execute: async (params) => {
          const confirmation: StockOutConfirmation = await this.stockCommands.buildStockOutConfirmation(stockActor, {
            sku: String(params.sku),
            quantity: Number(params.quantity),
            reason: params.reason ? String(params.reason) : undefined,
          });

          return {
            requiresConfirmation: true,
            confirmation,
          };
        },
      },
      {
        name: STOCK_AI_ACTION.RECORD_WASTE,
        description:
          'Record merma (waste): product lost, spoiled, expired or discarded. Decreases stock. Requires explicit user confirmation before executing.',
        parameters: z.object({
          sku: z.string().describe('Product SKU that was wasted'),
          quantity: z.number().int().positive().describe('Number of units wasted (must be positive)'),
          category: z
            .enum(WASTE_REASONS)
            .describe('Waste reason category: expired, damaged, prep_loss, theft, other'),
          reason: z.string().optional().describe('Optional free-text note about the waste'),
        }),
        execute: async (params) => {
          const confirmation: WasteConfirmation = await this.stockCommands.buildWasteConfirmation(stockActor, {
            sku: String(params.sku),
            quantity: Number(params.quantity),
            category: params.category as WasteConfirmation['category'],
            reason: params.reason ? String(params.reason) : undefined,
          });

          return {
            requiresConfirmation: true,
            confirmation,
          };
        },
      },
      {
        name: STOCK_AI_ACTION.GET_HISTORY,
        description:
          'Get the recent stock transaction history for a product (last 20 movements).',
        parameters: z.object({
          sku: z.string().describe('Product SKU to get transaction history for'),
        }),
        execute: async (params) => {
          return this.stockCommands.getRecentTransactions(String(params.sku));
        },
      },
    ];

    // Stock mutations are gated to sales-authorized roles; viewers keep only the
    // read-only history tool.
    if (canManageStock) {
      return allFunctions;
    }
    return allFunctions.filter((fn) => fn.name === STOCK_AI_ACTION.GET_HISTORY);
  }
}
