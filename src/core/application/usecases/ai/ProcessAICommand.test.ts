import { describe, it, expect, vi } from 'vitest';
import { ProcessAICommand } from './ProcessAICommand';
import { EnforcePlanLimit } from '@/core/application/usecases/billing/EnforcePlanLimit';
import { PlanLimitExceededError } from '@/core/domain/errors/BillingErrors';
import { AIServiceError } from '@/core/domain/errors/AIErrors';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import type { Subscription } from '@/core/domain/entities/Subscription';
import type { AIService } from '@/core/application/ports/AIService';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { AIFunctionRegistry } from '@/core/application/usecases/ai/AIFunctionRegistry';
import type { CompositeAIResponseFormatter } from '@/core/application/usecases/ai/CompositeAIResponseFormatter';
import type { AIConfirmationManager } from '@/core/application/usecases/ai/AIConfirmationManager';
import type { GetSubscription } from '@/core/application/usecases/billing/GetSubscription';
import type { RecordAiUsage } from '@/core/application/usecases/billing/RecordAiUsage';

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    organizationId: 42,
    plan: 'free',
    status: 'active',
    currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
    aiCallsUsedThisPeriod: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeDeps(opts: {
  subscription: Subscription;
  pendingConfirmation?: unknown;
}) {
  const ai = {
    chat: vi.fn().mockResolvedValue({
      message: 'ok',
      intent: { action: 'noop' },
      functionCalls: [],
      usage: { inputTokens: 10, outputTokens: 5 },
    }),
    chatStream: vi.fn().mockReturnValue({
      textStream: new ReadableStream<string>({
        start(controller) {
          controller.enqueue('ok');
          controller.close();
        },
      }),
      finalResponse: Promise.resolve({
        message: 'ok',
        intent: { action: 'noop' },
        functionCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
    }),
  } satisfies AIService;

  const conversations = {
    belongsToUser: vi.fn().mockResolvedValue(true),
  } as unknown as ConversationRepository;

  const messages = {
    create: vi.fn().mockResolvedValue({ id: 'm1' }),
    getLastMessages: vi.fn().mockResolvedValue([]),
  } as unknown as MessageRepository;

  const functionRegistry = {
    getFunctions: vi.fn().mockReturnValue([]),
    buildSystemPrompt: vi.fn().mockReturnValue('prompt'),
  } as unknown as AIFunctionRegistry;

  const responseFormatter = {
    format: vi.fn().mockResolvedValue('formatted'),
  } as unknown as CompositeAIResponseFormatter;

  const pending = opts.pendingConfirmation;
  const confirmations = {
    getPendingConfirmation: vi.fn().mockResolvedValue(pending),
    extractPendingConfirmation: vi.fn().mockReturnValue(undefined),
    handlePendingConfirmation: vi.fn().mockResolvedValue({
      response: 'confirmed',
      messageId: 'm-conf',
      actionPerformed: 'confirm',
      result: { ok: true },
      refreshPaths: [],
      shouldRefreshUi: false,
    }),
  } as unknown as AIConfirmationManager;

  const getSubscription = {
    execute: vi.fn().mockResolvedValue(opts.subscription),
  } as unknown as GetSubscription;

  const enforcePlanLimit = new EnforcePlanLimit();

  const recordAiUsage = {
    execute: vi.fn().mockResolvedValue(opts.subscription),
  } as unknown as RecordAiUsage;

  const uc = new ProcessAICommand({
    ai,
    conversations,
    messages,
    functionRegistry,
    responseFormatter,
    confirmations,
    organizationId: 42,
    getSubscription,
    enforcePlanLimit,
    recordAiUsage,
  });

  return {
    uc,
    ai,
    confirmations,
    recordAiUsage,
    getSubscription,
    messages,
  };
}

const input = {
  userId: 1,
  userRole: USER_ROLE.ADMIN,
  conversationId: 'conv-1',
  message: 'hola',
};

describe('ProcessAICommand — billing quota', () => {
  it('rejects chat when aiCallsUsedThisPeriod has reached the Free cap (100)', async () => {
    const { uc, ai, recordAiUsage } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 100 }),
    });

    await expect(uc.execute(input)).rejects.toBeInstanceOf(AIServiceError);

    // Did not call the model, did not bump usage.
    expect(ai.chat).not.toHaveBeenCalled();
    expect(recordAiUsage.execute).not.toHaveBeenCalled();
  });

  it('AIServiceError thrown at the cap wraps a PlanLimitExceededError', async () => {
    const { uc } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 100 }),
    });

    try {
      await uc.execute(input);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AIServiceError);
      const original = (err as AIServiceError).originalError;
      expect(original).toBeInstanceOf(PlanLimitExceededError);
      expect((original as PlanLimitExceededError).limitType).toBe('aiCalls');
    }
  });

  it('increments the AI counter once on a successful chat turn', async () => {
    const { uc, recordAiUsage, ai } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 5 }),
    });

    await uc.execute(input);

    expect(ai.chat).toHaveBeenCalledTimes(1);
    expect(recordAiUsage.execute).toHaveBeenCalledTimes(1);
    expect(recordAiUsage.execute).toHaveBeenCalledWith(42);
  });

  it('confirmation reply does NOT increment the counter and does NOT call the model', async () => {
    const pendingConfirmation = {
      action: 'product.delete',
      params: { sku: 'SKU-1' },
    };
    const { uc, ai, recordAiUsage, confirmations, getSubscription } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 50 }),
      pendingConfirmation,
    });

    await uc.execute({ ...input, message: 'sí' });

    expect(confirmations.handlePendingConfirmation).toHaveBeenCalledTimes(1);
    expect(ai.chat).not.toHaveBeenCalled();
    expect(recordAiUsage.execute).not.toHaveBeenCalled();
    // Quota is not even read on confirmation replies.
    expect(getSubscription.execute).not.toHaveBeenCalled();
  });

  it('confirmation reply is allowed even when the org is already at the AI cap', async () => {
    const { uc, recordAiUsage } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 100 }),
      pendingConfirmation: { action: 'product.delete', params: { sku: 'SKU-1' } },
    });

    await expect(uc.execute({ ...input, message: 'sí' })).resolves.toMatchObject({
      response: 'confirmed',
    });
    expect(recordAiUsage.execute).not.toHaveBeenCalled();
  });

  it('does NOT burn quota when the model turn fails after being called', async () => {
    const { uc, ai, recordAiUsage, messages } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 5 }),
    });
    // Quota is available, so the model IS called — but it fails mid-turn.
    (ai.chat as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('upstream 500'));

    await expect(uc.execute(input)).rejects.toBeInstanceOf(AIServiceError);

    expect(ai.chat).toHaveBeenCalledTimes(1);
    // The failed turn must not count against the org.
    expect(recordAiUsage.execute).not.toHaveBeenCalled();
    // user message + persisted error message = 2 create calls.
    expect(messages.create).toHaveBeenCalledTimes(2);
  });

  it('wraps the model error in AIServiceError preserving the original', async () => {
    const { uc, ai } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 5 }),
    });
    const boom = new Error('upstream 500');
    (ai.chat as ReturnType<typeof vi.fn>).mockRejectedValue(boom);

    try {
      await uc.execute(input);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AIServiceError);
      expect((err as AIServiceError).originalError).toBe(boom);
    }
  });
});

describe('ProcessAICommand — streaming quota', () => {
  async function drain(stream: ReadableStream<string>) {
    const reader = stream.getReader();
    // Read to completion so the producer settles, mirroring the SSE route.
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  }

  it('rejects the streaming turn at the Free cap without calling the model', async () => {
    const { uc, ai, recordAiUsage } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 100 }),
    });

    // The streaming pre-flight throws the limit error RAW (only `execute`
    // wraps it in AIServiceError). The SSE route catches it before opening the
    // stream and returns the message to the client.
    await expect(uc.executeStreaming(input)).rejects.toBeInstanceOf(PlanLimitExceededError);

    expect(ai.chatStream).not.toHaveBeenCalled();
    expect(recordAiUsage.execute).not.toHaveBeenCalled();
  });

  it('streams below the cap and increments the counter once after finishing', async () => {
    const { uc, ai, recordAiUsage } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 5 }),
    });

    const result = await uc.executeStreaming(input);
    expect(result.kind).toBe('stream');
    if (result.kind !== 'stream') return;

    await drain(result.textStream);
    await result.output;

    expect(ai.chatStream).toHaveBeenCalledTimes(1);
    expect(recordAiUsage.execute).toHaveBeenCalledTimes(1);
    expect(recordAiUsage.execute).toHaveBeenCalledWith(42);
  });

  it('streaming confirmation reply runs sync, does not call the model, and skips quota', async () => {
    const { uc, ai, recordAiUsage, getSubscription } = makeDeps({
      subscription: makeSub({ plan: 'free', aiCallsUsedThisPeriod: 100 }),
      pendingConfirmation: { action: 'product.delete', params: { sku: 'SKU-1' } },
    });

    const result = await uc.executeStreaming({ ...input, message: 'sí' });

    expect(result.kind).toBe('sync');
    expect(ai.chatStream).not.toHaveBeenCalled();
    expect(recordAiUsage.execute).not.toHaveBeenCalled();
    expect(getSubscription.execute).not.toHaveBeenCalled();
  });
});
