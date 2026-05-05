import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type {
  ProductCommandActor,
  ProductCommandService,
} from '@/core/application/usecases/products/ProductCommandService';
import type { AIPendingConfirmation, ProcessAICommandOutput } from '@/core/application/usecases/ai/types';
import {
  CONVERSATION_CONFIRMATION,
  MESSAGE_ROLE,
} from '@/core/domain/constants/ConversationConstants';
import { PRODUCT_AI_ACTION } from '@/core/domain/constants/ProductConstants';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';

export class AIConfirmationManager {
  constructor(
    private readonly deps: {
      messages: MessageRepository;
      productCommands: ProductCommandService;
    }
  ) {}

  async getPendingConfirmation(conversationId: string): Promise<AIPendingConfirmation | undefined> {
    const messages = await this.deps.messages.getLastMessages(conversationId, 1);
    const previousMessage = messages[0] ?? null;

    if (previousMessage?.role !== MESSAGE_ROLE.ASSISTANT) {
      return undefined;
    }

    return this.extractPendingConfirmation(previousMessage.metadata);
  }

  extractPendingConfirmation(source: unknown): AIPendingConfirmation | undefined {
    if (!source || typeof source !== 'object') {
      return undefined;
    }

    const metadata = source as {
      [CONVERSATION_CONFIRMATION.METADATA_KEY]?: AIPendingConfirmation;
      confirmation?: AIPendingConfirmation;
    };

    return metadata[CONVERSATION_CONFIRMATION.METADATA_KEY] ?? metadata.confirmation;
  }

  async handlePendingConfirmation(
    actor: ProductCommandActor,
    conversationId: string,
    userMessage: string,
    pendingConfirmation: AIPendingConfirmation,
    startTime: number
  ): Promise<ProcessAICommandOutput> {
    const normalizedMessage = this.normalizeConfirmationMessage(userMessage);

    if (this.isAffirmativeConfirmation(normalizedMessage)) {
      return this.confirmAction(actor, conversationId, pendingConfirmation, startTime);
    }

    if (this.isNegativeConfirmation(normalizedMessage)) {
      const response = `Operación cancelada. No ejecuté ${pendingConfirmation.action} para ${pendingConfirmation.sku} (${pendingConfirmation.productName}).`;
      const assistantMessage = await this.deps.messages.create({
        conversationId,
        role: MESSAGE_ROLE.ASSISTANT,
        content: response,
        metadata: {
          action: pendingConfirmation.action,
          success: false,
          executionTime: Date.now() - startTime,
        },
      });

      return {
        response,
        messageId: assistantMessage.id,
        actionPerformed: pendingConfirmation.action,
        result: { cancelled: true, confirmation: pendingConfirmation },
        refreshPaths: [],
        shouldRefreshUi: false,
      };
    }

    const response = `Necesito una confirmación explícita para eliminar ${pendingConfirmation.sku} (${pendingConfirmation.productName}). Responde "sí" para confirmar o "no" para cancelar.`;
    const assistantMessage = await this.deps.messages.create({
      conversationId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: response,
      metadata: {
        action: pendingConfirmation.action,
        success: false,
        executionTime: Date.now() - startTime,
        [CONVERSATION_CONFIRMATION.METADATA_KEY]: pendingConfirmation,
      },
    });

    return {
      response,
      messageId: assistantMessage.id,
      actionPerformed: pendingConfirmation.action,
      result: {
        requiresConfirmation: true,
        confirmation: pendingConfirmation,
      },
      refreshPaths: [],
      shouldRefreshUi: false,
    };
  }

  private async confirmAction(
    actor: ProductCommandActor,
    conversationId: string,
    pendingConfirmation: AIPendingConfirmation,
    startTime: number
  ): Promise<ProcessAICommandOutput> {
    if (pendingConfirmation.action !== PRODUCT_AI_ACTION.DELETE) {
      throw new Error(`Acción de confirmación no soportada: ${pendingConfirmation.action}`);
    }

    const result = await this.deps.productCommands.deleteBySku(actor, pendingConfirmation.sku);
    const response = `${AI_RESPONSE_ICON.SUCCESS} Eliminé el producto ${pendingConfirmation.sku} (${pendingConfirmation.productName}) del inventario.`;

    const assistantMessage = await this.deps.messages.create({
      conversationId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: response,
      metadata: {
        action: pendingConfirmation.action,
        success: true,
        executionTime: Date.now() - startTime,
      },
    });

    return {
      response,
      messageId: assistantMessage.id,
      actionPerformed: pendingConfirmation.action,
      result: result.data,
      refreshPaths: result.refreshPaths,
      shouldRefreshUi: result.refreshPaths.length > 0,
    };
  }

  private normalizeConfirmationMessage(message: string) {
    return message.trim().toLowerCase().replace(/[.!?,]/g, '');
  }

  private isAffirmativeConfirmation(message: string) {
    return this.matchesConfirmationResponse(
      message,
      CONVERSATION_CONFIRMATION.AFFIRMATIVE_RESPONSES
    );
  }

  private isNegativeConfirmation(message: string) {
    return this.matchesConfirmationResponse(
      message,
      CONVERSATION_CONFIRMATION.NEGATIVE_RESPONSES
    );
  }

  private matchesConfirmationResponse(message: string, responses: readonly string[]) {
    return responses.some(
      (value) =>
        message === value ||
        message.startsWith(`${value} `) ||
        message.endsWith(` ${value}`) ||
        message.includes(` ${value} `)
    );
  }
}