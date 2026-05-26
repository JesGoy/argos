import type { AIService } from '@/core/application/ports/AIService';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import { AIFunctionRegistry } from '@/core/application/usecases/ai/AIFunctionRegistry';
import { AIConfirmationManager } from '@/core/application/usecases/ai/AIConfirmationManager';
import { CompositeAIResponseFormatter } from '@/core/application/usecases/ai/CompositeAIResponseFormatter';
import type { ProcessAICommandOutput } from '@/core/application/usecases/ai/types';
import { CONVERSATION_DEFAULTS, MESSAGE_ROLE } from '@/core/domain/constants/ConversationConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import type { UserRole } from '@/core/domain/constants/UserConstants';
import { AIServiceError, ConversationNotFoundError } from '@/core/domain/errors/AIErrors';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';
import { AI_CONFIG } from '@/infra/ai/config';

export interface ProcessAICommandInput {
  userId: number;
  userRole: UserRole;
  conversationId: string;
  message: string;
}

export class ProcessAICommand {
  constructor(
    private readonly deps: {
      ai: AIService;
      conversations: ConversationRepository;
      messages: MessageRepository;
      functionRegistry: AIFunctionRegistry;
      responseFormatter: CompositeAIResponseFormatter;
      confirmations: AIConfirmationManager;
    }
  ) {}

  async execute(input: ProcessAICommandInput): Promise<ProcessAICommandOutput> {
    const startTime = Date.now();

    try {
      const isOwnedByUser = await this.deps.conversations.belongsToUser(
        input.conversationId,
        input.userId
      );
      if (!isOwnedByUser) {
        throw new ConversationNotFoundError(input.conversationId);
      }

      const actor: ProductCommandActor = {
        userId: String(input.userId),
        role: input.userRole,
        source: PRODUCT_COMMAND_SOURCE.AI,
      };

      await this.deps.messages.create({
        conversationId: input.conversationId,
        role: MESSAGE_ROLE.USER,
        content: input.message,
        metadata: {
          intent: undefined,
        },
      });

      const pendingConfirmation = await this.deps.confirmations.getPendingConfirmation(
        input.conversationId
      );
      if (pendingConfirmation) {
        return this.deps.confirmations.handlePendingConfirmation(
          actor,
          input.conversationId,
          input.message,
          pendingConfirmation,
          startTime
        );
      }

      const history = await this.deps.messages.getLastMessages(
        input.conversationId,
        CONVERSATION_DEFAULTS.MAX_HISTORY_MESSAGES
      );
      const availableFunctions = this.deps.functionRegistry.getFunctions(actor, history);
      const systemPrompt = this.deps.functionRegistry.buildSystemPrompt(AI_CONFIG.systemPrompt);
      const aiResponse = await this.deps.ai.chat(history, availableFunctions, systemPrompt);

      const functionResult = aiResponse.functionCall?.result;
      const actionPerformed = aiResponse.functionCall?.name;
      const refreshPaths = this.extractRefreshPaths(functionResult);
      const finalResponse = actionPerformed && functionResult
        ? await this.deps.responseFormatter.format(actionPerformed, functionResult, aiResponse.message)
        : aiResponse.message;

      const assistantMetadata: Record<string, unknown> = {
        intent: aiResponse.intent?.action,
        action: actionPerformed,
        success: this.isSuccessfulResult(functionResult),
        executionTime: Date.now() - startTime,
      };

      const nextPendingConfirmation = this.deps.confirmations.extractPendingConfirmation(functionResult);
      if (nextPendingConfirmation) {
        assistantMetadata.pendingConfirmation = nextPendingConfirmation;
      }

      const assistantMessage = await this.deps.messages.create({
        conversationId: input.conversationId,
        role: MESSAGE_ROLE.ASSISTANT,
        content: finalResponse,
        metadata: assistantMetadata,
      });

      return {
        response: finalResponse,
        messageId: assistantMessage.id,
        actionPerformed,
        result: functionResult,
        refreshPaths,
        shouldRefreshUi: refreshPaths.length > 0,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido al procesar comando';

      await this.deps.messages.create({
        conversationId: input.conversationId,
        role: MESSAGE_ROLE.ASSISTANT,
        content: `${AI_RESPONSE_ICON.ERROR} Lo siento, ocurrió un error: ${errorMessage}`,
        metadata: {
          error: errorMessage,
          success: false,
          executionTime: Date.now() - startTime,
        },
      });

      throw new AIServiceError(errorMessage, error as Error);
    }
  }

  private extractRefreshPaths(result: unknown): readonly string[] {
    if (!result || typeof result !== 'object' || !('refreshPaths' in result)) {
      return [];
    }

    const refreshPaths = (result as { refreshPaths?: readonly string[] }).refreshPaths;
    return Array.isArray(refreshPaths) ? refreshPaths : [];
  }

  private isSuccessfulResult(result: unknown) {
    if (!result || typeof result !== 'object') {
      return undefined;
    }

    if ('requiresConfirmation' in result || 'cancelled' in result) {
      return false;
    }

    return true;
  }
}