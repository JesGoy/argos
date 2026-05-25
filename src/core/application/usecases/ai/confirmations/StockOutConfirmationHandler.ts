import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type {
  StockCommandActor,
  StockCommandService,
  StockOutConfirmation,
} from '@/core/application/usecases/stock/StockCommandService';
import type {
  AIPendingConfirmation,
  ConfirmationHandler,
  ProcessAICommandOutput,
} from '@/core/application/usecases/ai/types';
import { STOCK_AI_ACTION } from '@/core/domain/constants/StockConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { MESSAGE_ROLE } from '@/core/domain/constants/ConversationConstants';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';

export class StockOutConfirmationHandler implements ConfirmationHandler {
  constructor(
    private readonly deps: {
      messages: MessageRepository;
      stockCommands: StockCommandService;
    }
  ) {}

  supports(action: string): boolean {
    return action === STOCK_AI_ACTION.STOCK_OUT;
  }

  async execute(
    actor: ProductCommandActor,
    conversationId: string,
    confirmation: AIPendingConfirmation,
    startTime: number
  ): Promise<ProcessAICommandOutput> {
    if (confirmation.action !== STOCK_AI_ACTION.STOCK_OUT) {
      throw new Error(`StockOutConfirmationHandler: acción no soportada: ${confirmation.action}`);
    }

    const stockOutConfirmation = confirmation as StockOutConfirmation;
    const stockActor: StockCommandActor = {
      userId: Number(actor.userId),
      role: actor.role,
      source: PRODUCT_COMMAND_SOURCE.AI,
    };

    const result = await this.deps.stockCommands.executeStockOut(stockActor, stockOutConfirmation);
    const response = `${AI_RESPONSE_ICON.SUCCESS} Salida de stock registrada: ${stockOutConfirmation.quantity} unidades de ${stockOutConfirmation.productName} (${stockOutConfirmation.sku}).`;

    const assistantMessage = await this.deps.messages.create({
      conversationId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: response,
      metadata: {
        action: STOCK_AI_ACTION.STOCK_OUT,
        success: true,
        executionTime: Date.now() - startTime,
      },
    });

    return {
      response,
      messageId: assistantMessage.id,
      actionPerformed: STOCK_AI_ACTION.STOCK_OUT,
      result: result.data,
      refreshPaths: result.refreshPaths,
      shouldRefreshUi: result.refreshPaths.length > 0,
    };
  }
}
