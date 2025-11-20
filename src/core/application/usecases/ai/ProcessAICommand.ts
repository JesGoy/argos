import type { AIService, AIFunction } from '@/core/application/ports/AIService';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { Message } from '@/core/domain/entities/Message';
import { AIServiceError } from '@/core/domain/errors/AIErrors';
import { ConversationNotFoundError } from '@/core/domain/errors/AIErrors';

/**
 * Input for ProcessAICommand
 */
export interface ProcessAICommandInput {
  userId: number;
  conversationId: string;
  message: string;
}

/**
 * Output from ProcessAICommand
 */
export interface ProcessAICommandOutput {
  response: string;
  messageId: string;
  actionPerformed?: string;
  result?: any;
}

/**
 * Use Case: Process AI Command
 * Processes user messages using AI and executes corresponding product actions
 */
export class ProcessAICommand {
  constructor(
    private readonly deps: {
      ai: AIService;
      conversations: ConversationRepository;
      messages: MessageRepository;
      products: ProductRepository;
    }
  ) {}

  async execute(input: ProcessAICommandInput): Promise<ProcessAICommandOutput> {
    const startTime = Date.now();

    try {
      // 1. Verify conversation exists
      const conversationExists = await this.deps.conversations.exists(input.conversationId);
      if (!conversationExists) {
        throw new ConversationNotFoundError(input.conversationId);
      }

      // 2. Save user message
      const userMessage = await this.deps.messages.create({
        conversationId: input.conversationId,
        role: 'user',
        content: input.message,
        metadata: {
          intent: undefined,
        },
      });

      // 3. Get conversation history (last 10 messages for context)
      const history = await this.deps.messages.getLastMessages(input.conversationId, 10);

      // 4. Define available functions for AI
      const availableFunctions = this.defineProductFunctions();

      // 5. Get AI response with function calling
      const aiResponse = await this.deps.ai.chat(history, availableFunctions);

      // 6. Execute function if AI decided to call one
      let functionResult;
      let actionPerformed;

      if (aiResponse.functionCall) {
        const func = availableFunctions.find((f) => f.name === aiResponse.functionCall!.name);
        if (func) {
          actionPerformed = aiResponse.functionCall.name;
          functionResult = await func.execute(aiResponse.functionCall.arguments);
        }
      }

      // 7. Generate final response including function result
      const finalResponse = functionResult
        ? await this.generateResponseWithResult(
            aiResponse.message,
            actionPerformed!,
            functionResult
          )
        : aiResponse.message;

      // 8. Save assistant message
      const assistantMessage = await this.deps.messages.create({
        conversationId: input.conversationId,
        role: 'assistant',
        content: finalResponse,
        metadata: {
          intent: aiResponse.intent?.action,
          action: actionPerformed,
          success: !!functionResult,
          executionTime: Date.now() - startTime,
        },
      });

      return {
        response: finalResponse,
        messageId: assistantMessage.id,
        actionPerformed,
        result: functionResult,
      };
    } catch (error) {
      // Log error and save error message
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido al procesar comando';

      await this.deps.messages.create({
        conversationId: input.conversationId,
        role: 'assistant',
        content: `❌ Lo siento, ocurrió un error: ${errorMessage}`,
        metadata: {
          error: errorMessage,
          success: false,
          executionTime: Date.now() - startTime,
        },
      });

      throw new AIServiceError(errorMessage, error as Error);
    }
  }

  /**
   * Define functions that AI can call for product management
   */
  private defineProductFunctions(): AIFunction[] {
    return [
      {
        name: 'create_product',
        description:
          'Create a new product in the inventory. Requires SKU (uppercase letters, numbers, hyphens), name, category, and unit.',
        parameters: {
          sku: { type: 'string', description: 'Unique product SKU (e.g., PROD-001)' },
          name: { type: 'string', description: 'Product name' },
          category: { type: 'string', description: 'Product category' },
          unit: {
            type: 'string',
            enum: ['pcs', 'kg', 'liter', 'meter', 'box'],
            description: 'Unit of measurement',
          },
          description: { type: 'string', optional: true, description: 'Product description' },
          minStock: { type: 'number', optional: true, description: 'Minimum stock level' },
          reorderPoint: { type: 'number', optional: true, description: 'Reorder point' },
        },
        execute: async (params) => {
          return await this.deps.products.create({
            sku: params.sku,
            name: params.name,
            category: params.category,
            unit: params.unit,
            description: params.description,
            minStock: params.minStock ?? 0,
            reorderPoint: params.reorderPoint ?? 10,
          });
        },
      },
      {
        name: 'update_product',
        description:
          'Update an existing product. Can update any field except ID. Requires SKU to identify the product.',
        parameters: {
          sku: { type: 'string', description: 'Product SKU to update' },
          name: { type: 'string', optional: true, description: 'New product name' },
          category: { type: 'string', optional: true, description: 'New category' },
          unit: {
            type: 'string',
            enum: ['pcs', 'kg', 'liter', 'meter', 'box'],
            optional: true,
            description: 'New unit',
          },
          description: { type: 'string', optional: true, description: 'New description' },
          minStock: { type: 'number', optional: true, description: 'New minimum stock' },
          reorderPoint: { type: 'number', optional: true, description: 'New reorder point' },
        },
        execute: async (params) => {
          const product = await this.deps.products.findBySku(params.sku);
          if (!product) {
            throw new Error(`Producto con SKU ${params.sku} no encontrado`);
          }

          const { sku, ...updateData } = params;
          await this.deps.products.update(product.id, updateData);

          return { success: true, sku: params.sku, updated: Object.keys(updateData) };
        },
      },
      {
        name: 'delete_product',
        description:
          'Delete a product from the inventory. This action cannot be undone. Requires SKU.',
        parameters: {
          sku: { type: 'string', description: 'SKU of the product to delete' },
        },
        execute: async (params) => {
          const product = await this.deps.products.findBySku(params.sku);
          if (!product) {
            throw new Error(`Producto con SKU ${params.sku} no encontrado`);
          }

          await this.deps.products.delete(product.id);

          return { success: true, sku: params.sku, name: product.name };
        },
      },
      {
        name: 'get_product',
        description: 'Get detailed information about a specific product by SKU.',
        parameters: {
          sku: { type: 'string', description: 'Product SKU to retrieve' },
        },
        execute: async (params) => {
          const product = await this.deps.products.findBySku(params.sku);
          if (!product) {
            throw new Error(`Producto con SKU ${params.sku} no encontrado`);
          }

          return product;
        },
      },
      {
        name: 'list_products',
        description: 'List all products or filter by category.',
        parameters: {
          category: {
            type: 'string',
            optional: true,
            description: 'Filter by category (optional)',
          },
        },
        execute: async (params) => {
          const products = await this.deps.products.findAll(
            params.category ? { category: params.category } : undefined
          );

          return {
            total: products.length,
            products: products.map((p) => ({
              sku: p.sku,
              name: p.name,
              category: p.category,
              unit: p.unit,
              minStock: p.minStock,
            })),
          };
        },
      },
    ];
  }

  /**
   * Generate a natural language response including function execution result
   */
  private async generateResponseWithResult(
    baseMessage: string,
    action: string,
    result: any
  ): Promise<string> {
    // Add result details to the response
    if (action === 'create_product') {
      return `✅ ${baseMessage}\n\nProducto creado exitosamente:\n• SKU: ${result.sku}\n• Nombre: ${result.name}\n• Categoría: ${result.category}\n• Unidad: ${result.unit}`;
    }

    if (action === 'update_product') {
      return `✅ ${baseMessage}\n\nProducto ${result.sku} actualizado correctamente.`;
    }

    if (action === 'delete_product') {
      return `✅ ${baseMessage}\n\nProducto ${result.sku} (${result.name}) eliminado del inventario.`;
    }

    if (action === 'get_product') {
      return `📦 ${baseMessage}\n\n**${result.name}**\n• SKU: ${result.sku}\n• Categoría: ${result.category}\n• Unidad: ${result.unit}\n• Stock mínimo: ${result.minStock}\n• Punto de reorden: ${result.reorderPoint}`;
    }

    if (action === 'list_products') {
      const productList = result.products
        .map((p: any) => `  • ${p.sku} - ${p.name} (${p.category})`)
        .join('\n');
      return `📦 ${baseMessage}\n\nEncontrados ${result.total} productos:\n${productList}`;
    }

    return baseMessage;
  }
}
