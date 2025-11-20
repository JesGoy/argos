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
 * AI Response structure
 */
export interface AIResponse {
  message: string;
  intent?: AIIntent;
  functionCall?: {
    name: string;
    arguments: any;
    result?: any;
  };
  suggestions?: string[];
}
