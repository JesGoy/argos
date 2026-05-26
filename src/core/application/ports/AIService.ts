import type { z } from 'zod';
import type { Message } from '@/core/domain/entities/Message';
import type { AIResponse } from '@/core/domain/entities/AIIntent';

export interface AIFunction {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface AIService {
  chat(messages: Message[], availableFunctions: AIFunction[], systemPrompt?: string): Promise<AIResponse>;
}
