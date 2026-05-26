import { z } from 'zod';
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

  getSystemPromptSection(): string {
    return `## Gestión de productos:
- Crear, actualizar y eliminar productos con sus atributos (SKU, nombre, categoría, unidad, stock mínimo, punto de reorden, descripción).
- Buscar productos por SKU o nombre, listar por categoría.
- Consultar alertas de stock bajo.
- La eliminación requiere confirmación explícita del usuario.`;
  }

  getFunctions(actor: ProductCommandActor, history: Message[]): AIFunction[] {
    return [
      {
        name: PRODUCT_AI_ACTION.CREATE,
        description:
          'Create a new product in the inventory. Requires SKU (uppercase letters, numbers, hyphens), name, category, and unit.',
        parameters: z.object({
          sku: z.string().describe('Unique product SKU (e.g., PROD-001). Uppercase letters, numbers and hyphens only.'),
          name: z.string().describe('Product name'),
          category: z.string().describe('Product category'),
          unit: z.enum(PRODUCT_UNITS).describe('Unit of measurement: pcs, kg, liter, meter, box'),
          description: z.string().optional().describe('Product description'),
          minStock: z.number().optional().describe('Minimum stock level (default: 0)'),
          reorderPoint: z.number().optional().describe('Reorder point (default: 10)'),
        }),
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
        parameters: z.object({
          sku: z.string().describe('Product SKU to update'),
          name: z.string().optional().describe('New product name'),
          category: z.string().optional().describe('New category'),
          unit: z.enum(PRODUCT_UNITS).optional().describe('New unit of measurement'),
          description: z.string().optional().describe('New description'),
          minStock: z.number().optional().describe('New minimum stock level'),
          reorderPoint: z.number().optional().describe('New reorder point'),
        }),
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
        parameters: z.object({
          sku: z.string().describe('SKU of the product to delete'),
        }),
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
        parameters: z.object({
          sku: z.string().describe('Product SKU to retrieve'),
        }),
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
        parameters: z.object({
          category: z.string().optional().describe('Filter products by category (optional)'),
        }),
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
        parameters: z.object({
          sku: z.string().describe('Product SKU to check stock for'),
        }),
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
        parameters: z.object({
          query: z.string().describe('Search term to find products by name'),
        }),
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
        parameters: z.object({}),
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
    params: Record<string, unknown>,
    history: Message[]
  ): Record<string, unknown> {
    const userMessages = history
      .filter((message) => message.role === MESSAGE_ROLE.USER)
      .map((message) => message.content)
      .reverse()
      .slice(0, 3);

    return {
      ...params,
      minStock: this.resolveNumericField(
        params.minStock,
        userMessages,
        AI_PRODUCT_MESSAGE_PATTERNS.MIN_STOCK
      ),
      reorderPoint: this.resolveNumericField(
        params.reorderPoint,
        userMessages,
        AI_PRODUCT_MESSAGE_PATTERNS.REORDER_POINT
      ),
    };
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
