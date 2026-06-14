import type { AIFunction } from '@/core/application/ports/AIService';
import type {
  ProductCommandActor,
  ProductDeleteConfirmation,
} from '@/core/application/usecases/products/ProductCommandService';
import type {
  StockOutConfirmation,
  WasteConfirmation,
} from '@/core/application/usecases/stock/StockCommandService';
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
  getSystemPromptSection?(): string;
}

export interface AIResultFormatter {
  supportsAction(action: string): boolean;
  format(action: string, result: unknown): Promise<string>;
}

export interface ConfirmationHandler {
  supports(action: string): boolean;
  execute(
    actor: ProductCommandActor,
    conversationId: string,
    confirmation: AIPendingConfirmation,
    startTime: number
  ): Promise<ProcessAICommandOutput>;
}

export type AIPendingConfirmation =
  | ProductDeleteConfirmation
  | StockOutConfirmation
  | WasteConfirmation;
