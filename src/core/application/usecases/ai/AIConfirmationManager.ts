import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type {
  AIPendingConfirmation,
  ConfirmationHandler,
  ProcessAICommandOutput,
} from '@/core/application/usecases/ai/types';
import {
  CONVERSATION_CONFIRMATION,
  MESSAGE_ROLE,
} from '@/core/domain/constants/ConversationConstants';
import { AI_RESPONSE_MESSAGE } from '@/infra/ai/constants';

export class AIConfirmationManager {
  constructor(
    private readonly deps: {
      messages: MessageRepository;
      handlers: ConfirmationHandler[];
    }
  ) {}

  async getPendingConfirmation(conversationId: string): Promise<AIPendingConfirmation | undefined> {
    const messages = await this.deps.messages.getLastMessages(conversationId, 2);
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === MESSAGE_ROLE.ASSISTANT);

    if (!lastAssistantMessage) {
      return undefined;
    }

    return this.extractPendingConfirmation(lastAssistantMessage.metadata);
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
      return this.dispatchToHandler(actor, conversationId, pendingConfirmation, startTime);
    }

    if (this.isNegativeConfirmation(normalizedMessage)) {
      const response = AI_RESPONSE_MESSAGE.CONFIRMATION_CANCELLED(
        pendingConfirmation.action,
        pendingConfirmation.sku,
        pendingConfirmation.productName
      );
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

    const response = AI_RESPONSE_MESSAGE.CONFIRMATION_REQUIRED(
      pendingConfirmation.action,
      pendingConfirmation.sku,
      pendingConfirmation.productName
    );
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

  private async dispatchToHandler(
    actor: ProductCommandActor,
    conversationId: string,
    confirmation: AIPendingConfirmation,
    startTime: number
  ): Promise<ProcessAICommandOutput> {
    const handler = this.deps.handlers.find((h) => h.supports(confirmation.action));
    if (!handler) {
      throw new Error(`No hay handler registrado para la acción de confirmación: ${confirmation.action}`);
    }
    return handler.execute(actor, conversationId, confirmation, startTime);
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
