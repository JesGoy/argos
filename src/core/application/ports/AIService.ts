import type { z } from 'zod';
import type { Message } from '@/core/domain/entities/Message';
import type { AIResponse } from '@/core/domain/entities/AIIntent';

export interface AIFunction {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Streaming turn handle. `textStream` yields model text deltas as they arrive;
 * `finalResponse` resolves with the same shape as `chat()` once the loop
 * finishes (text settled, tools executed, usage tallied).
 */
export interface AIStreamingResponse {
  textStream: ReadableStream<string>;
  finalResponse: Promise<AIResponse>;
}

export interface AIService {
  chat(messages: Message[], availableFunctions: AIFunction[], systemPrompt?: string): Promise<AIResponse>;
  chatStream(
    messages: Message[],
    availableFunctions: AIFunction[],
    systemPrompt?: string
  ): AIStreamingResponse;
}
