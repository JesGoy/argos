/**
 * AI Intent Entity
 * Represents the extracted intent and entities from user input
 */
export interface AIIntent {
  action: AIAction;
  confidence: number;
  entities: AIEntities;
  requiresConfirmation: boolean;
}

/**
 * Available AI actions for product management
 */
export type AIAction =
  | 'create_product'
  | 'update_product'
  | 'delete_product'
  | 'get_product'
  | 'list_products'
  | 'search_products'
  | 'unknown';

/**
 * Extracted entities from user input
 */
export interface AIEntities {
  // Product identification
  sku?: string;
  productId?: string;
  
  // Product attributes
  name?: string;
  description?: string;
  category?: string;
  unit?: 'pcs' | 'kg' | 'liter' | 'meter' | 'box';
  
  // Stock information
  minStock?: number;
  reorderPoint?: number;
  
  // Search/filter criteria
  searchTerm?: string;
  filters?: {
    category?: string;
    unit?: string;
  };
}

/**
 * A single tool/function invocation the model made during a turn.
 */
export interface AIFunctionCall {
  name: string;
  arguments: unknown;
  result?: unknown;
}

/**
 * Token usage + cost telemetry for an AI turn.
 * Persisted in Message.metadata to price plans and detect runaway loops.
 */
export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  steps?: number;
  finishReason?: string;
  estimatedCostUsd?: number;
}

/**
 * AI Response structure
 */
export interface AIResponse {
  message: string;
  intent?: AIIntent;
  /**
   * All tool calls made during the turn, in order. With the multi-step agentic
   * loop a single user message can trigger several (e.g. read trend → check
   * stock → recommend). Empty when the model only chatted.
   */
  functionCalls?: AIFunctionCall[];
  /**
   * Back-compat single-call view: the primary call (a pending-confirmation call
   * if any, otherwise the last call). Prefer `functionCalls`.
   */
  functionCall?: AIFunctionCall;
  usage?: AIUsage;
  suggestions?: string[];
}
