import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type {
  StockCommandActor,
  StockCommandService,
  WasteConfirmation,
} from '@/core/application/usecases/stock/StockCommandService';
import type {
  AIPendingConfirmation,
  ConfirmationHandler,
  ProcessAICommandOutput,
} from '@/core/application/usecases/ai/types';
import { STOCK_AI_ACTION, WASTE_REASON_LABELS, type WasteReason } from '@/core/domain/constants/StockConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { MESSAGE_ROLE } from '@/core/domain/constants/ConversationConstants';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';

export class WasteConfirmationHandler implements ConfirmationHandler {
  constructor(
    private readonly deps: {
      messages: MessageRepository;
      stockCommands: StockCommandService;
    }
  ) {}

  supports(action: string): boolean {
    return action === STOCK_AI_ACTION.RECORD_WASTE;
  }

  async execute(
    actor: ProductCommandActor,
    conversationId: string,
    confirmation: AIPendingConfirmation,
    startTime: number
  ): Promise<ProcessAICommandOutput> {
    if (confirmation.action !== STOCK_AI_ACTION.RECORD_WASTE) {
      throw new Error(`WasteConfirmationHandler: acción no soportada: ${confirmation.action}`);
    }

    const wasteConfirmation = confirmation as WasteConfirmation;
    const stockActor: StockCommandActor = {
      userId: Number(actor.userId),
      role: actor.role,
      source: PRODUCT_COMMAND_SOURCE.AI,
    };

    const result = await this.deps.stockCommands.executeWaste(stockActor, wasteConfirmation);
    const categoryLabel = WASTE_REASON_LABELS[wasteConfirmation.category as WasteReason] ?? wasteConfirmation.category;
    const response = `${AI_RESPONSE_ICON.SUCCESS} Merma registrada: ${wasteConfirmation.quantity} unidades de ${wasteConfirmation.productName} (${wasteConfirmation.sku}) — ${categoryLabel}.`;

    const assistantMessage = await this.deps.messages.create({
      conversationId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: response,
      metadata: {
        action: STOCK_AI_ACTION.RECORD_WASTE,
        success: true,
        executionTime: Date.now() - startTime,
      },
    });

    return {
      response,
      messageId: assistantMessage.id,
      actionPerformed: STOCK_AI_ACTION.RECORD_WASTE,
      result: result.data,
      refreshPaths: result.refreshPaths,
      shouldRefreshUi: result.refreshPaths.length > 0,
    };
  }
}
