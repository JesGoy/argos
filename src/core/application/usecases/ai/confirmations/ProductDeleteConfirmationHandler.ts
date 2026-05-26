import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type {
  ProductCommandActor,
  ProductCommandService,
} from '@/core/application/usecases/products/ProductCommandService';
import type {
  AIPendingConfirmation,
  ConfirmationHandler,
  ProcessAICommandOutput,
} from '@/core/application/usecases/ai/types';
import { PRODUCT_AI_ACTION } from '@/core/domain/constants/ProductConstants';
import { MESSAGE_ROLE } from '@/core/domain/constants/ConversationConstants';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';

export class ProductDeleteConfirmationHandler implements ConfirmationHandler {
  constructor(
    private readonly deps: {
      messages: MessageRepository;
      productCommands: ProductCommandService;
    }
  ) {}

  supports(action: string): boolean {
    return action === PRODUCT_AI_ACTION.DELETE;
  }

  async execute(
    actor: ProductCommandActor,
    conversationId: string,
    confirmation: AIPendingConfirmation,
    startTime: number
  ): Promise<ProcessAICommandOutput> {
    if (confirmation.action !== PRODUCT_AI_ACTION.DELETE) {
      throw new Error(`ProductDeleteConfirmationHandler: acción no soportada: ${confirmation.action}`);
    }

    const result = await this.deps.productCommands.deleteBySku(actor, confirmation.sku);
    const response = `${AI_RESPONSE_ICON.SUCCESS} Eliminé el producto ${confirmation.sku} (${confirmation.productName}) del inventario.`;

    const assistantMessage = await this.deps.messages.create({
      conversationId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: response,
      metadata: {
        action: confirmation.action,
        success: true,
        executionTime: Date.now() - startTime,
      },
    });

    return {
      response,
      messageId: assistantMessage.id,
      actionPerformed: confirmation.action,
      result: result.data,
      refreshPaths: result.refreshPaths,
      shouldRefreshUi: result.refreshPaths.length > 0,
    };
  }
}
