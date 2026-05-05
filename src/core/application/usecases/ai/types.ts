import type { AIFunction } from '@/core/application/ports/AIService';
import type {
  ProductCommandActor,
  ProductDeleteConfirmation,
} from '@/core/application/usecases/products/ProductCommandService';
import type { Message } from '@/core/domain/entities/Message';

export interface ProcessAICommandOutput {
  response: string;
  messageId: string;
  actionPerformed?: string;
  result?: unknown;
  refreshPaths: readonly string[];
  shouldRefreshUi: boolean;
}

export interface AIFunctionProvider {
  getFunctions(actor: ProductCommandActor, history: Message[]): AIFunction[];
}

export interface AIResultFormatter {
  supportsAction(action: string): boolean;
  format(action: string, result: unknown): Promise<string>;
}

export type AIPendingConfirmation = ProductDeleteConfirmation;