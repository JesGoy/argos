import type { AIFunction } from '@/core/application/ports/AIService';
import type {
  ProductCommandActor,
  ProductCommandService,
} from '@/core/application/usecases/products/ProductCommandService';
import type { AIFunctionProvider } from '@/core/application/usecases/ai/types';
import type { Message } from '@/core/domain/entities/Message';
import { MESSAGE_ROLE } from '@/core/domain/constants/ConversationConstants';
import {
  PRODUCT_AI_ACTION,
  PRODUCT_UNITS,
} from '@/core/domain/constants/ProductConstants';
import { InvalidProductDataError } from '@/core/domain/errors/ProductErrors';
import {
  AI_PRODUCT_MESSAGE_PATTERNS,
} from '@/infra/ai/constants';
import {
  parseCreateProductInput,
  parseUpdateProductInput,
} from '@/infra/validation/product';
import type {
  CreateProductAIResult,
  DeleteProductAIResult,
  GetProductAIResult,
  ProductCollectionAIResult,
  StockAIResult,
  UpdateProductAIResult,
} from '@/core/application/usecases/ai/product/ProductAIResultTypes';

export class ProductAIFunctionProvider implements AIFunctionProvider {
  constructor(private readonly productCommands: ProductCommandService) {}

  getFunctions(actor: ProductCommandActor, history: Message[]): AIFunction[] {
    return [
      {
        name: PRODUCT_AI_ACTION.CREATE,
        description:
          'Create a new product in the inventory. Requires SKU (uppercase letters, numbers, hyphens), name, category, and unit.',
        parameters: {
          sku: { type: 'string', description: 'Unique product SKU (e.g., PROD-001)' },
          name: { type: 'string', description: 'Product name' },
          category: { type: 'string', description: 'Product category' },
          unit: {
            type: 'string',
            enum: PRODUCT_UNITS,
            description: 'Unit of measurement',
          },
          description: { type: 'string', optional: true, description: 'Product description' },
          minStock: { type: 'number', optional: true, description: 'Minimum stock level' },
          reorderPoint: { type: 'number', optional: true, description: 'Reorder point' },
        },
        execute: async (params) => {
          const parsed = parseCreateProductInput(this.enrichMutationParams(params, history));
          if (!parsed.success) {
            throw new InvalidProductDataError(parsed.error.issues[0]?.message ?? 'Datos inválidos');
          }

          const result = await this.productCommands.create(actor, parsed.data);

          return {
            product: result.data,
            refreshPaths: result.refreshPaths,
          } satisfies CreateProductAIResult;
        },
      },
      {
        name: PRODUCT_AI_ACTION.UPDATE,
        description:
          'Update an existing product. Can update any field except ID. Requires SKU to identify the product.',
        parameters: {
          sku: { type: 'string', description: 'Product SKU to update' },
          name: { type: 'string', optional: true, description: 'New product name' },
          category: { type: 'string', optional: true, description: 'New category' },
          unit: {
            type: 'string',
            enum: PRODUCT_UNITS,
            optional: true,
            description: 'New unit',
          },
          description: { type: 'string', optional: true, description: 'New description' },
          minStock: { type: 'number', optional: true, description: 'New minimum stock' },
          reorderPoint: { type: 'number', optional: true, description: 'New reorder point' },
        },
        execute: async (params) => {
          const parsed = parseUpdateProductInput(this.enrichMutationParams(params, history));
          if (!parsed.success) {
            throw new InvalidProductDataError(parsed.error.issues[0]?.message ?? 'Datos inválidos');
          }

          const updateData = { ...parsed.data };
          delete updateData.sku;

          const result = await this.productCommands.updateBySku(
            actor,
            String(parsed.data.sku ?? params.sku),
            updateData
          );

          return {
            product: result.data,
            refreshPaths: result.refreshPaths,
          } satisfies UpdateProductAIResult;
        },
      },
      {
        name: PRODUCT_AI_ACTION.DELETE,
        description:
          'Delete a product from the inventory. This action cannot be undone. Requires SKU.',
        parameters: {
          sku: { type: 'string', description: 'SKU of the product to delete' },
        },
        execute: async (params) => {
          const confirmation = await this.productCommands.buildDeleteConfirmation(
            actor,
            String(params.sku)
          );

          return {
            requiresConfirmation: true,
            confirmation,
          } satisfies DeleteProductAIResult;
        },
      },
      {
        name: PRODUCT_AI_ACTION.GET,
        description: 'Get detailed information about a specific product by SKU.',
        parameters: {
          sku: { type: 'string', description: 'Product SKU to retrieve' },
        },
        execute: async (params) => {
          const result = await this.productCommands.getBySku(String(params.sku));

          return {
            product: result.data,
          } satisfies GetProductAIResult;
        },
      },
      {
        name: PRODUCT_AI_ACTION.LIST,
        description: 'List all products or filter by category.',
        parameters: {
          category: {
            type: 'string',
            optional: true,
            description: 'Filter by category (optional)',
          },
        },
        execute: async (params) => {
          const result = await this.productCommands.list(
            params.category ? { category: String(params.category) } : undefined
          );

          return {
            total: result.data.length,
            products: result.data.map((product) => ({
              sku: product.sku,
              name: product.name,
              category: product.category,
              unit: product.unit,
              minStock: product.minStock,
            })),
          } satisfies ProductCollectionAIResult;
        },
      },
      {
        name: PRODUCT_AI_ACTION.CHECK_STOCK,
        description: 'Check current stock level for a specific product by SKU.',
        parameters: {
          sku: { type: 'string', description: 'Product SKU to check stock' },
        },
        execute: async (params) => {
          const result = await this.productCommands.getCurrentStockBySku(String(params.sku));

          return {
            product: {
              sku: result.data.product.sku,
              name: result.data.product.name,
            },
            currentStock: result.data.currentStock,
            reorderPoint: result.data.product.reorderPoint,
            isLowStock: result.data.isLowStock,
          } satisfies StockAIResult;
        },
      },
      {
        name: PRODUCT_AI_ACTION.SEARCH_BY_NAME,
        description: 'Search for products by name or partial name match.',
        parameters: {
          query: { type: 'string', description: 'Search term to find products' },
        },
        execute: async (params) => {
          const result = await this.productCommands.searchByName(String(params.query));

          return {
            total: result.data.length,
            products: result.data.map((product) => ({
              sku: product.sku,
              name: product.name,
              category: product.category,
              unit: product.unit,
            })),
          } satisfies ProductCollectionAIResult;
        },
      },
      {
        name: PRODUCT_AI_ACTION.GET_LOW_STOCK,
        description: 'Get list of products that are low in stock (below reorder point).',
        parameters: {},
        execute: async () => {
          const result = await this.productCommands.getLowStockProducts();

          return {
            total: result.data.length,
            products: result.data.map((product) => ({
              sku: product.sku,
              name: product.name,
              category: product.category,
              currentStock: product.currentStock,
              reorderPoint: product.reorderPoint,
              deficit: product.deficit,
              unit: product.unit,
            })),
          } satisfies ProductCollectionAIResult;
        },
      },
    ];
  }

  private enrichMutationParams(
    params: unknown,
    history: Message[]
  ): Record<string, unknown> {
    const baseParams = this.asRecord(params);
    const userMessages = history
      .filter((message) => message.role === MESSAGE_ROLE.USER)
      .map((message) => message.content)
      .reverse()
      .slice(0, 3);

    return {
      ...baseParams,
      minStock: this.resolveNumericField(
        baseParams.minStock,
        userMessages,
        AI_PRODUCT_MESSAGE_PATTERNS.MIN_STOCK
      ),
      reorderPoint: this.resolveNumericField(
        baseParams.reorderPoint,
        userMessages,
        AI_PRODUCT_MESSAGE_PATTERNS.REORDER_POINT
      ),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return { ...(value as Record<string, unknown>) };
  }

  private resolveNumericField(
    currentValue: unknown,
    userMessages: readonly string[],
    patterns: readonly RegExp[]
  ): unknown {
    const extractedValue = this.extractNumberFromMessages(userMessages, patterns);
    if (extractedValue !== undefined) {
      return extractedValue;
    }

    return currentValue;
  }

  private extractNumberFromMessages(
    userMessages: readonly string[],
    patterns: readonly RegExp[]
  ): number | undefined {
    for (const userMessage of userMessages) {
      for (const pattern of patterns) {
        const match = userMessage.match(pattern);
        const rawValue = match?.[1];

        if (!rawValue) {
          continue;
        }

        const parsedValue = Number(rawValue);
        if (!Number.isNaN(parsedValue)) {
          return parsedValue;
        }
      }
    }

    return undefined;
  }
}