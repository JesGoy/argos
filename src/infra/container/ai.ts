import type { AIService } from '@/core/application/ports/AIService';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';

import { VercelAIService } from '@/infra/ai/VercelAIService';
import { ConversationRepositoryDrizzle } from '@/infra/repositories/ConversationRepositoryDrizzle';
import { MessageRepositoryDrizzle } from '@/infra/repositories/MessageRepositoryDrizzle';
import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';

import { CreateConversation } from '@/core/application/usecases/conversations/CreateConversation';
import { GetConversationHistory } from '@/core/application/usecases/conversations/GetConversationHistory';
import { GetConversationById } from '@/core/application/usecases/conversations/GetConversationById';
import { GetConversationMessages } from '@/core/application/usecases/conversations/GetConversationMessages';
import { DeleteConversation } from '@/core/application/usecases/conversations/DeleteConversation';
import { ProcessAICommand } from '@/core/application/usecases/ai/ProcessAICommand';

/**
 * AI Service Singleton
 */
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new VercelAIService();
  }
  return aiServiceInstance;
}

/**
 * Conversation Repository Singleton
 */
let conversationRepoInstance: ConversationRepository | null = null;

export function getConversationRepository(): ConversationRepository {
  if (!conversationRepoInstance) {
    conversationRepoInstance = new ConversationRepositoryDrizzle();
  }
  return conversationRepoInstance;
}

/**
 * Message Repository Singleton
 */
let messageRepoInstance: MessageRepository | null = null;

export function getMessageRepository(): MessageRepository {
  if (!messageRepoInstance) {
    messageRepoInstance = new MessageRepositoryDrizzle();
  }
  return messageRepoInstance;
}

/**
 * Product Repository Singleton (reused from products container)
 */
let productRepoInstance: ProductRepository | null = null;

export function getProductRepository(): ProductRepository {
  if (!productRepoInstance) {
    productRepoInstance = new ProductRepositoryDrizzle();
  }
  return productRepoInstance;
}

/**
 * Use Case Factories
 */

export function makeCreateConversation(): CreateConversation {
  return new CreateConversation({
    conversations: getConversationRepository(),
    messages: getMessageRepository(),
  });
}

export function makeGetConversationHistory(): GetConversationHistory {
  return new GetConversationHistory({
    conversations: getConversationRepository(),
  });
}

export function makeGetConversationById(): GetConversationById {
  return new GetConversationById({
    conversations: getConversationRepository(),
  });
}

export function makeGetConversationMessages(): GetConversationMessages {
  return new GetConversationMessages({
    conversations: getConversationRepository(),
    messages: getMessageRepository(),
  });
}

export function makeDeleteConversation(): DeleteConversation {
  return new DeleteConversation({
    conversations: getConversationRepository(),
    messages: getMessageRepository(),
  });
}

export function makeProcessAICommand(): ProcessAICommand {
  return new ProcessAICommand({
    ai: getAIService(),
    conversations: getConversationRepository(),
    messages: getMessageRepository(),
    products: getProductRepository(),
  });
}
