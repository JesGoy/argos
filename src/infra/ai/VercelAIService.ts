import { generateText, tool } from 'ai';
import type { AIService, AIFunction } from '@/core/application/ports/AIService';
import type { Message } from '@/core/domain/entities/Message';
import type { AIResponse } from '@/core/domain/entities/AIIntent';
import { openaiModel, AI_CONFIG } from '@/infra/ai/config';

export class VercelAIService implements AIService {
  async chat(messages: Message[], availableFunctions: AIFunction[], systemPrompt?: string): Promise<AIResponse> {
    const sdkMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    if (!sdkMessages.some((m) => m.role === 'system')) {
      sdkMessages.unshift({
        role: 'system',
        content: systemPrompt ?? AI_CONFIG.systemPrompt,
      });
    }

    if (availableFunctions.length === 0) {
      const result = await generateText({
        model: openaiModel,
        messages: sdkMessages,
        temperature: AI_CONFIG.temperature,
      });
      return { message: result.text };
    }

    const builtTools = Object.fromEntries(
      availableFunctions.map((fn) => [
        fn.name,
        tool({
          description: fn.description,
          inputSchema: fn.parameters,
          execute: (input: unknown) => fn.execute(input as Record<string, unknown>),
        }),
      ])
    );

    const result = await generateText({
      model: openaiModel,
      messages: sdkMessages,
      tools: builtTools as unknown as Record<string, never>,
      toolChoice: 'auto',
      stopWhen: ({ steps }) => steps.length > 0,
      temperature: AI_CONFIG.temperature,
    });

    const toolCall = result.toolCalls?.[0];
    const toolResult = result.toolResults?.[0] as { output: unknown } | undefined;

    if (toolCall && toolResult) {
      return {
        message: result.text ?? '',
        functionCall: {
          name: toolCall.toolName,
          arguments: (toolCall as { input?: unknown }).input ?? {},
          result: toolResult.output,
        },
      };
    }

    return { message: result.text };
  }
}
