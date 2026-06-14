import type { AIService } from '@/core/application/ports/AIService';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
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
import { AnalyticsAIResponseFormatter } from '@/core/application/usecases/ai/formatters/AnalyticsAIResponseFormatter';
import { ProductAIFunctionProvider } from '@/core/application/usecases/ai/providers/ProductAIFunctionProvider';
import { SalesAIFunctionProvider } from '@/core/application/usecases/ai/providers/SalesAIFunctionProvider';
import { StockAIFunctionProvider } from '@/core/application/usecases/ai/providers/StockAIFunctionProvider';
import { AnalyticsAIFunctionProvider } from '@/core/application/usecases/ai/providers/AnalyticsAIFunctionProvider';
import { makeAnalyticsService } from '@/infra/container/analytics';
import {
  makeEnforcePlanLimit,
  makeGetSubscription,
  makeRecordAiUsage,
} from '@/infra/container/billing';
import { ProductDeleteConfirmationHandler } from '@/core/application/usecases/ai/confirmations/ProductDeleteConfirmationHandler';
import { StockOutConfirmationHandler } from '@/core/application/usecases/ai/confirmations/StockOutConfirmationHandler';
import { WasteConfirmationHandler } from '@/core/application/usecases/ai/confirmations/WasteConfirmationHandler';
import { StockCommandService } from '@/core/application/usecases/stock/StockCommandService';
import { ProcessAICommand } from '@/core/application/usecases/ai/ProcessAICommand';
import { ORGANIZATION_DEFAULTS } from '@/core/domain/constants/OrganizationConstants';

/**
 * AI Service Singleton (no tenant state)
 */
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new VercelAIService();
  }
  return aiServiceInstance;
}

/**
 * Message Repository Singleton.
 * Messages are reached only through a conversation whose ownership/org is
 * validated first, so this repository is not itself org-scoped.
 */
let messageRepoInstance: MessageRepository | null = null;

export function getMessageRepository(): MessageRepository {
  if (!messageRepoInstance) {
    messageRepoInstance = new MessageRepositoryDrizzle();
  }
  return messageRepoInstance;
}

/**
 * Conversation Repository (org-scoped — built per request)
 */
export function makeConversationRepository(organizationId: number): ConversationRepository {
  return new ConversationRepositoryDrizzle(organizationId);
}

/**
 * Use Case Factories (all org-scoped)
 */

export function makeCreateConversation(organizationId: number): CreateConversation {
  return new CreateConversation({
    conversations: makeConversationRepository(organizationId),
    messages: getMessageRepository(),
  });
}

export function makeGetConversationHistory(organizationId: number): GetConversationHistory {
  return new GetConversationHistory({
    conversations: makeConversationRepository(organizationId),
  });
}

export function makeGetConversationById(organizationId: number): GetConversationById {
  return new GetConversationById({
    conversations: makeConversationRepository(organizationId),
  });
}

export function makeGetConversationMessages(organizationId: number): GetConversationMessages {
  return new GetConversationMessages({
    conversations: makeConversationRepository(organizationId),
    messages: getMessageRepository(),
  });
}

export function makeDeleteConversation(organizationId: number): DeleteConversation {
  return new DeleteConversation({
    conversations: makeConversationRepository(organizationId),
    messages: getMessageRepository(),
  });
}

export function makeStockCommandService(organizationId: number): StockCommandService {
  return new StockCommandService({
    products: new ProductRepositoryDrizzle(organizationId),
    stockTransactions: new StockTransactionRepositoryDrizzle(organizationId),
  });
}

export function makeProcessAICommand(
  organizationId: number,
  currency: string = ORGANIZATION_DEFAULTS.CURRENCY,
): ProcessAICommand {
  const messages = getMessageRepository();
  const productCommands = makeProductCommandService(organizationId);
  const stockCommands = makeStockCommandService(organizationId);
  const saleRepository: SaleRepository = new SaleRepositoryDrizzle(organizationId);
  const analytics = makeAnalyticsService(organizationId);

  return new ProcessAICommand({
    ai: getAIService(),
    conversations: makeConversationRepository(organizationId),
    messages,
    functionRegistry: new AIFunctionRegistry([
      new ProductAIFunctionProvider(productCommands),
      new SalesAIFunctionProvider(saleRepository),
      new StockAIFunctionProvider(stockCommands),
      new AnalyticsAIFunctionProvider(analytics),
    ]),
    responseFormatter: new CompositeAIResponseFormatter([
      new ProductAIResponseFormatter(),
      new SalesAIResponseFormatter(currency),
      new StockAIResponseFormatter(),
      new AnalyticsAIResponseFormatter(currency),
    ]),
    confirmations: new AIConfirmationManager({
      messages,
      handlers: [
        new ProductDeleteConfirmationHandler({ messages, productCommands }),
        new StockOutConfirmationHandler({ messages, stockCommands }),
        new WasteConfirmationHandler({ messages, stockCommands }),
      ],
    }),
    organizationId,
    getSubscription: makeGetSubscription(),
    enforcePlanLimit: makeEnforcePlanLimit(),
    recordAiUsage: makeRecordAiUsage(),
  });
}
