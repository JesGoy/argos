import type { AIService } from '@/core/application/ports/AIService';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';

import { VercelAIService } from '@/infra/ai/VercelAIService';
import { ConversationRepositoryDrizzle } from '@/infra/repositories/ConversationRepositoryDrizzle';
import { MessageRepositoryDrizzle } from '@/infra/repositories/MessageRepositoryDrizzle';
import { SaleRepositoryDrizzle } from '@/infra/repositories/SaleRepositoryDrizzle';
import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';
import { StockTransactionRepositoryDrizzle } from '@/infra/repositories/StockTransactionRepositoryDrizzle';
import { makeProductCommandService } from '@/infra/container/products';

import { CreateConversation } from '@/core/application/usecases/conversations/CreateConversation';
import { GetConversationHistory } from '@/core/application/usecases/conversations/GetConversationHistory';
import { GetConversationById } from '@/core/application/usecases/conversations/GetConversationById';
import { GetConversationMessages } from '@/core/application/usecases/conversations/GetConversationMessages';
import { DeleteConversation } from '@/core/application/usecases/conversations/DeleteConversation';
import { AIFunctionRegistry } from '@/core/application/usecases/ai/AIFunctionRegistry';
import { AIConfirmationManager } from '@/core/application/usecases/ai/AIConfirmationManager';
import { CompositeAIResponseFormatter } from '@/core/application/usecases/ai/CompositeAIResponseFormatter';
import { ProductAIResponseFormatter } from '@/core/application/usecases/ai/formatters/ProductAIResponseFormatter';
import { SalesAIResponseFormatter } from '@/core/application/usecases/ai/formatters/SalesAIResponseFormatter';
import { StockAIResponseFormatter } from '@/core/application/usecases/ai/formatters/StockAIResponseFormatter';
import { ProductAIFunctionProvider } from '@/core/application/usecases/ai/providers/ProductAIFunctionProvider';
import { SalesAIFunctionProvider } from '@/core/application/usecases/ai/providers/SalesAIFunctionProvider';
import { StockAIFunctionProvider } from '@/core/application/usecases/ai/providers/StockAIFunctionProvider';
import { ProductDeleteConfirmationHandler } from '@/core/application/usecases/ai/confirmations/ProductDeleteConfirmationHandler';
import { StockOutConfirmationHandler } from '@/core/application/usecases/ai/confirmations/StockOutConfirmationHandler';
import { StockCommandService } from '@/core/application/usecases/stock/StockCommandService';
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
 * Sale Repository Singleton
 */
let saleRepoInstance: SaleRepository | null = null;

export function getSaleRepository(): SaleRepository {
  if (!saleRepoInstance) {
    saleRepoInstance = new SaleRepositoryDrizzle();
  }
  return saleRepoInstance;
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

export function makeStockCommandService(): StockCommandService {
  return new StockCommandService({
    products: new ProductRepositoryDrizzle(),
    stockTransactions: new StockTransactionRepositoryDrizzle(),
  });
}

export function makeProcessAICommand(): ProcessAICommand {
  const messages = getMessageRepository();
  const productCommands = makeProductCommandService();
  const stockCommands = makeStockCommandService();

  return new ProcessAICommand({
    ai: getAIService(),
    conversations: getConversationRepository(),
    messages,
    functionRegistry: new AIFunctionRegistry([
      new ProductAIFunctionProvider(productCommands),
      new SalesAIFunctionProvider(getSaleRepository()),
      new StockAIFunctionProvider(stockCommands),
    ]),
    responseFormatter: new CompositeAIResponseFormatter([
      new ProductAIResponseFormatter(),
      new SalesAIResponseFormatter(),
      new StockAIResponseFormatter(),
    ]),
    confirmations: new AIConfirmationManager({
      messages,
      handlers: [
        new ProductDeleteConfirmationHandler({ messages, productCommands }),
        new StockOutConfirmationHandler({ messages, stockCommands }),
      ],
    }),
  });
}
