import type { AIService } from '@/core/application/ports/AIService';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ProductCommandActor } from '@/core/application/usecases/products/ProductCommandService';
import type { EnforcePlanLimit } from '@/core/application/usecases/billing/EnforcePlanLimit';
import type { GetSubscription } from '@/core/application/usecases/billing/GetSubscription';
import type { RecordAiUsage } from '@/core/application/usecases/billing/RecordAiUsage';
import type { AIResponse } from '@/core/domain/entities/AIIntent';
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

/**
 * Result of `executeStreaming`. `sync` is returned when the turn must run
 * non-streamed (currently: replying to a pending confirmation). `stream`
 * exposes the model's text deltas and a promise that resolves once the loop,
 * formatter override and DB persistence are complete.
 */
export type ProcessAIStreamingOutput =
  | { kind: 'sync'; output: ProcessAICommandOutput }
  | {
      kind: 'stream';
      textStream: ReadableStream<string>;
      output: Promise<ProcessAICommandOutput>;
    };

export class ProcessAICommand {
  constructor(
    private readonly deps: {
      ai: AIService;
      conversations: ConversationRepository;
      messages: MessageRepository;
      functionRegistry: AIFunctionRegistry;
      responseFormatter: CompositeAIResponseFormatter;
      confirmations: AIConfirmationManager;
      organizationId: number;
      getSubscription: GetSubscription;
      enforcePlanLimit: EnforcePlanLimit;
      recordAiUsage: RecordAiUsage;
    }
  ) {}

  async execute(input: ProcessAICommandInput): Promise<ProcessAICommandOutput> {
    const startTime = Date.now();

    try {
      const actor = await this.prepareTurn(input);
      const pending = await this.deps.confirmations.getPendingConfirmation(input.conversationId);
      if (pending) {
        // Confirmation replies are deterministic execution — no model call,
        // no quota burn.
        return this.deps.confirmations.handlePendingConfirmation(
          actor,
          input.conversationId,
          input.message,
          pending,
          startTime
        );
      }

      await this.assertAiQuota();

      const { history, availableFunctions, systemPrompt } = await this.buildTurnContext(
        actor,
        input.conversationId
      );
      const aiResponse = await this.deps.ai.chat(history, availableFunctions, systemPrompt);
      return this.finalizeResponse(input.conversationId, aiResponse, startTime);
    } catch (error) {
      await this.persistError(input.conversationId, error, startTime);
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Error desconocido al procesar comando',
        error as Error
      );
    }
  }

  async executeStreaming(input: ProcessAICommandInput): Promise<ProcessAIStreamingOutput> {
    const startTime = Date.now();

    const actor = await this.prepareTurn(input);
    const pending = await this.deps.confirmations.getPendingConfirmation(input.conversationId);
    if (pending) {
      // Confirmation replies don't hit the model; deterministic execution + DB
      // write is faster as a single sync response than as an SSE stream.
      const output = await this.deps.confirmations.handlePendingConfirmation(
        actor,
        input.conversationId,
        input.message,
        pending,
        startTime
      );
      return { kind: 'sync', output };
    }

    await this.assertAiQuota();

    const { history, availableFunctions, systemPrompt } = await this.buildTurnContext(
      actor,
      input.conversationId
    );
    const { textStream, finalResponse } = this.deps.ai.chatStream(
      history,
      availableFunctions,
      systemPrompt
    );

    const output = (async (): Promise<ProcessAICommandOutput> => {
      try {
        const aiResponse = await finalResponse;
        return await this.finalizeResponse(input.conversationId, aiResponse, startTime);
      } catch (error) {
        await this.persistError(input.conversationId, error, startTime);
        throw new AIServiceError(
          error instanceof Error ? error.message : 'Error desconocido al procesar comando',
          error as Error
        );
      }
    })();

    return { kind: 'stream', textStream, output };
  }

  private async prepareTurn(input: ProcessAICommandInput): Promise<ProductCommandActor> {
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
      metadata: { intent: undefined },
    });

    return actor;
  }

  private async buildTurnContext(actor: ProductCommandActor, conversationId: string) {
    const history = await this.deps.messages.getLastMessages(
      conversationId,
      CONVERSATION_DEFAULTS.MAX_HISTORY_MESSAGES
    );
    const availableFunctions = this.deps.functionRegistry.getFunctions(actor, history);
    const systemPrompt = this.deps.functionRegistry.buildSystemPrompt(
      AI_CONFIG.systemPrompt,
      actor
    );
    return { history, availableFunctions, systemPrompt };
  }

  /**
   * Compute the canonical assistant text, persist the assistant message with
   * full telemetry, and surface refresh hints. Shared by `execute` and
   * `executeStreaming` so the streamed and non-streamed paths produce
   * byte-identical persisted state.
   */
  private async finalizeResponse(
    conversationId: string,
    aiResponse: AIResponse,
    startTime: number
  ): Promise<ProcessAICommandOutput> {
    const functionCalls =
      aiResponse.functionCalls ?? (aiResponse.functionCall ? [aiResponse.functionCall] : []);
    const refreshPaths = this.aggregateRefreshPaths(functionCalls);

    // A staged destructive op (delete / stock-out / merma) stops the loop and
    // takes priority — surface its confirmation message. Otherwise prefer the
    // model's synthesized final text; fall back to deterministic formatting
    // when the model produced no text (single tool call, no narration).
    const confirmationCall = functionCalls.find((c) =>
      this.deps.confirmations.extractPendingConfirmation(c.result)
    );
    const lastCall = functionCalls[functionCalls.length - 1];
    const primaryCall = confirmationCall ?? lastCall;
    const actionPerformed = primaryCall?.name;
    const functionResult = primaryCall?.result;

    const hasModelText = !!aiResponse.message && aiResponse.message.trim().length > 0;
    let finalResponse: string;
    if (confirmationCall) {
      finalResponse = await this.deps.responseFormatter.format(
        confirmationCall.name,
        confirmationCall.result,
        aiResponse.message
      );
    } else if (hasModelText) {
      finalResponse = aiResponse.message;
    } else if (actionPerformed && functionResult) {
      finalResponse = await this.deps.responseFormatter.format(
        actionPerformed,
        functionResult,
        aiResponse.message
      );
    } else {
      finalResponse = aiResponse.message;
    }

    const assistantMetadata: Record<string, unknown> = {
      intent: aiResponse.intent?.action,
      action: actionPerformed,
      actions: functionCalls.map((c) => c.name),
      success: this.isSuccessfulResult(functionResult),
      executionTime: Date.now() - startTime,
      usage: aiResponse.usage,
    };

    const nextPendingConfirmation = this.deps.confirmations.extractPendingConfirmation(functionResult);
    if (nextPendingConfirmation) {
      assistantMetadata.pendingConfirmation = nextPendingConfirmation;
    }

    const assistantMessage = await this.deps.messages.create({
      conversationId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: finalResponse,
      metadata: assistantMetadata,
    });

    // Burn one quota unit only after the assistant message is persisted, so
    // model errors / validation failures don't count against the org.
    await this.deps.recordAiUsage.execute(this.deps.organizationId);

    return {
      response: finalResponse,
      messageId: assistantMessage.id,
      actionPerformed,
      result: functionResult,
      refreshPaths,
      shouldRefreshUi: refreshPaths.length > 0,
    };
  }

  private async assertAiQuota(): Promise<void> {
    const subscription = await this.deps.getSubscription.execute(this.deps.organizationId);
    this.deps.enforcePlanLimit.execute({
      plan: subscription.plan,
      limitType: 'aiCalls',
      current: subscription.aiCallsUsedThisPeriod,
    });
  }

  private async persistError(conversationId: string, error: unknown, startTime: number) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido al procesar comando';

    await this.deps.messages.create({
      conversationId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: `${AI_RESPONSE_ICON.ERROR} Lo siento, ocurrió un error: ${errorMessage}`,
      metadata: {
        error: errorMessage,
        success: false,
        executionTime: Date.now() - startTime,
      },
    });
  }

  private aggregateRefreshPaths(
    calls: ReadonlyArray<{ result?: unknown }>
  ): readonly string[] {
    const paths = new Set<string>();
    for (const call of calls) {
      for (const path of this.extractRefreshPaths(call.result)) {
        paths.add(path);
      }
    }
    return [...paths];
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
