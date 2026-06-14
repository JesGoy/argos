import {
  generateText,
  stepCountIs,
  streamText,
  tool,
  type StepResult,
  type ToolSet,
} from 'ai';
import type {
  AIService,
  AIFunction,
  AIStreamingResponse,
} from '@/core/application/ports/AIService';
import type { Message } from '@/core/domain/entities/Message';
import type { AIFunctionCall, AIResponse, AIUsage } from '@/core/domain/entities/AIIntent';
import { openaiModel, streamingModel, AI_CONFIG, AI_MAX_STEPS, estimateCostUsd } from '@/infra/ai/config';

type SdkMessage = { role: 'user' | 'assistant' | 'system'; content: string };

/**
 * True when a tool result asks for explicit confirmation. Used to stop the
 * agentic loop the moment a destructive op is staged, so the model can't keep
 * acting and we surface exactly that confirmation to the user.
 */
function resultRequiresConfirmation(output: unknown): boolean {
  return (
    !!output &&
    typeof output === 'object' &&
    (output as { requiresConfirmation?: boolean }).requiresConfirmation === true
  );
}

export class VercelAIService implements AIService {
  async chat(messages: Message[], availableFunctions: AIFunction[], systemPrompt?: string): Promise<AIResponse> {
    const sdkMessages = this.buildSdkMessages(messages, systemPrompt);

    if (availableFunctions.length === 0) {
      const result = await generateText({
        model: openaiModel,
        messages: sdkMessages,
        temperature: AI_CONFIG.temperature,
      });
      return { message: result.text, usage: this.buildUsage(result) };
    }

    const builtTools = this.buildTools(availableFunctions);

    const result = await generateText({
      model: openaiModel,
      messages: sdkMessages,
      tools: builtTools as unknown as ToolSet,
      toolChoice: 'auto',
      stopWhen: this.buildStopConditions(),
      temperature: AI_CONFIG.temperature,
    });

    return this.buildResponse(result.text ?? '', result.steps, result);
  }

  chatStream(
    messages: Message[],
    availableFunctions: AIFunction[],
    systemPrompt?: string
  ): AIStreamingResponse {
    const sdkMessages = this.buildSdkMessages(messages, systemPrompt);
    const hasTools = availableFunctions.length > 0;
    const builtTools = hasTools ? this.buildTools(availableFunctions) : undefined;

    const result = streamText({
      model: streamingModel,
      messages: sdkMessages,
      temperature: AI_CONFIG.temperature,
      ...(hasTools
        ? {
            tools: builtTools as unknown as ToolSet,
            toolChoice: 'auto' as const,
            stopWhen: this.buildStopConditions(),
          }
        : {}),
    });

    const finalResponse = (async (): Promise<AIResponse> => {
      const [text, steps, totalUsage, finishReason] = await Promise.all([
        result.text,
        result.steps,
        result.totalUsage,
        result.finishReason,
      ]);
      return this.buildResponse(text ?? '', steps, { totalUsage, finishReason, steps });
    })();

    return { textStream: result.textStream, finalResponse };
  }

  private buildSdkMessages(messages: Message[], systemPrompt?: string): SdkMessage[] {
    const sdkMessages: SdkMessage[] = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    if (!sdkMessages.some((m) => m.role === 'system')) {
      sdkMessages.unshift({
        role: 'system',
        content: systemPrompt ?? AI_CONFIG.systemPrompt,
      });
    }

    return sdkMessages;
  }

  private buildTools(availableFunctions: AIFunction[]) {
    return Object.fromEntries(
      availableFunctions.map((fn) => [
        fn.name,
        tool({
          description: fn.description,
          inputSchema: fn.parameters,
          execute: (input: unknown) => fn.execute(input as Record<string, unknown>),
        }),
      ])
    );
  }

  // Multi-step agentic loop: chain reads/recommendations, but stop at the step
  // cap OR as soon as a tool stages a confirmation.
  private buildStopConditions() {
    return [
      stepCountIs(AI_MAX_STEPS),
      ({ steps }: { steps: ReadonlyArray<StepResult<ToolSet>> }) => {
        const last = steps[steps.length - 1];
        return (last?.toolResults ?? []).some((r) =>
          resultRequiresConfirmation((r as { output?: unknown }).output)
        );
      },
    ];
  }

  private buildResponse(
    message: string,
    steps: ReadonlyArray<StepResult<ToolSet>>,
    usageSource: {
      totalUsage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
      usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
      finishReason?: string;
      steps?: ReadonlyArray<unknown>;
    }
  ): AIResponse {
    const functionCalls = this.collectFunctionCalls(steps);
    // Primary call (back-compat): a pending-confirmation call wins, else the last.
    const primaryCall =
      functionCalls.find((c) => resultRequiresConfirmation(c.result)) ??
      functionCalls[functionCalls.length - 1];

    return {
      message,
      functionCalls,
      functionCall: primaryCall,
      usage: this.buildUsage(usageSource),
    };
  }

  private collectFunctionCalls(steps: ReadonlyArray<StepResult<ToolSet>>): AIFunctionCall[] {
    const calls: AIFunctionCall[] = [];

    for (const step of steps) {
      const toolCalls = step.toolCalls ?? [];
      const toolResults = step.toolResults ?? [];

      toolCalls.forEach((call, index) => {
        const matchingResult = toolResults[index] as { output?: unknown } | undefined;
        calls.push({
          name: call.toolName,
          arguments: (call as { input?: unknown }).input ?? {},
          result: matchingResult?.output,
        });
      });
    }

    return calls;
  }

  private buildUsage(result: {
    totalUsage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
    finishReason?: string;
    steps?: ReadonlyArray<unknown>;
  }): AIUsage {
    const usage = result.totalUsage ?? result.usage ?? {};
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;

    return {
      inputTokens,
      outputTokens,
      totalTokens: usage.totalTokens ?? inputTokens + outputTokens,
      steps: result.steps?.length ?? 1,
      finishReason: result.finishReason,
      estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
    };
  }
}
