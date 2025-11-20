import type { Message } from '@/core/domain/entities/Message';
import type { AIIntent, AIResponse } from '@/core/domain/entities/AIIntent';

/**
 * AI Function definition for tool calling
 */
export interface AIFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

/**
 * AI Service Port
 * Contract for AI language model operations
 */
export interface AIService {
  /**
   * Process a chat completion with function calling
   * @param messages - Conversation history
   * @param availableFunctions - Functions that the AI can call
   * @returns AI response with potential function calls
   */
  chat(messages: Message[], availableFunctions: AIFunction[]): Promise<AIResponse>;

  /**
   * Extract intent and entities from user message
   * @param userMessage - User's input message
   * @returns Extracted intent and entities
   */
  extractIntent(userMessage: string): Promise<AIIntent>;

  /**
   * Generate a natural language response
   * @param context - Context for response generation
   * @param data - Data to include in response
   * @returns Generated response text
   */
  generateResponse(context: string, data?: any): Promise<string>;

  /**
   * Stream a chat response (for real-time UI updates)
   * @param messages - Conversation history
   * @param availableFunctions - Functions that the AI can call
   * @returns Async iterator for streaming response
   */
  streamChat(
    messages: Message[],
    availableFunctions: AIFunction[]
  ): AsyncIterable<string>;
}
