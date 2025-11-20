import { generateText, streamText } from 'ai';
import type { AIService, AIFunction } from '@/core/application/ports/AIService';
import type { Message } from '@/core/domain/entities/Message';
import type { AIIntent, AIResponse, AIAction } from '@/core/domain/entities/AIIntent';
import { openaiModel, AI_CONFIG } from '@/infra/ai/config';

/**
 * Vercel AI SDK implementation of AIService
 */
export class VercelAIService implements AIService {
  /**
   * Process a chat completion with function calling
   */
  async chat(messages: Message[], availableFunctions: AIFunction[]): Promise<AIResponse> {
    // Convert messages to AI SDK format
    const sdkMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Add system message if not present
    if (!sdkMessages.some((m) => m.role === 'system')) {
      sdkMessages.unshift({
        role: 'system',
        content: AI_CONFIG.systemPrompt,
      });
    }

    // Convert functions to OpenAI-compatible JSON Schema format
    const tools: Record<string, any> = {};
    availableFunctions.forEach((fn) => {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      Object.entries(fn.parameters).forEach(([key, config]: [string, any]) => {
        const property: any = {
          type: config.type,
        };

        // Add description if present
        if (config.description) {
          property.description = config.description;
        }

        // Add enum if present
        if (config.enum && Array.isArray(config.enum)) {
          property.enum = config.enum;
        }

        properties[key] = property;

        // Track required fields (required by default unless optional is true)
        if (!config.optional) {
          required.push(key);
        }
      });

      // Build proper JSON Schema structure
      tools[fn.name] = {
        description: fn.description,
        parameters: {
          type: 'object',
          properties,
          required,
          additionalProperties: false,
        },
      };
    });

    // Debug: Log tools structure
    console.log('=== TOOLS DEBUG ===');
    console.log('Number of tools:', Object.keys(tools).length);
    console.log('Tool names:', Object.keys(tools));

    // Use a two-step approach: first get intent, then execute function
    // Step 1: Get AI to understand what the user wants in structured format
    // Include conversation history for context
    const intentSystemPrompt = `Eres un asistente que analiza intenciones en comandos de inventario.
Tu tarea es determinar qué acción quiere realizar el usuario basándote en la conversación completa.

IMPORTANTE - Contexto de la conversación:
- Si en mensajes anteriores se mencionaron productos con sus SKUs, puedes usar esa información
- Si el usuario dice "elimínalo", "bórralo", "elimina ese" sin especificar SKU, busca el SKU en mensajes anteriores
- Si se listaron productos y el usuario se refiere a "ese producto", "el primero", etc., identifica el SKU del contexto

Responde SOLO con un JSON con esta estructura:
{
  "action": "create_product" | "update_product" | "delete_product" | "get_product" | "list_products" | "none",
  "parameters": { ...datos extraídos del mensaje y del contexto... }
}

Ejemplos:
Conversación 1:
  Usuario: "lista productos"
  Asistente: "Tienes 1 producto: Telefono (SKU: 123)"
  Usuario: "elimínalo"
  → {"action": "delete_product", "parameters": {"sku": "123"}}

Conversación 2:
  Usuario: "elimina el producto 123"
  → {"action": "delete_product", "parameters": {"sku": "123"}}

Conversación 3:
  Usuario: "lista productos de tecnología"
  Asistente: "Encontrados 2 productos: Mouse (SKU: M-001), Teclado (SKU: T-001)"
  Usuario: "elimina el mouse"
  → {"action": "delete_product", "parameters": {"sku": "M-001"}}`;

    const intentMessages = [
      { role: 'system' as const, content: intentSystemPrompt },
      ...sdkMessages, // Include full conversation history
      {
        role: 'user' as const,
        content: 'Analiza la conversación y extrae la acción e parámetros en formato JSON.',
      },
    ];

    const intentResult = await generateText({
      model: openaiModel,
      messages: intentMessages,
      temperature: 0.3,
    });

    // Try to parse the intent
    let intentData: any = null;
    try {
      let jsonText = intentResult.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\s*$/g, '').trim();
      }
      intentData = JSON.parse(jsonText);
      console.log('=== INTENT DETECTED ===');
      console.log('Action:', intentData.action);
      console.log('Parameters:', JSON.stringify(intentData.parameters, null, 2));
    } catch (e) {
      console.log('Could not parse intent, treating as conversational');
      console.log('Raw intent text:', intentResult.text);
    }

    // Step 2: If we detected an action, execute the corresponding function
    if (intentData && intentData.action && intentData.action !== 'none') {
      const functionToExecute = availableFunctions.find(
        (fn) => fn.name === intentData.action
      );

      if (functionToExecute) {
        // Step 2.1: Validate required parameters before executing
        const missingParams = this.validateRequiredParameters(
          functionToExecute,
          intentData.parameters
        );

        if (missingParams.length > 0) {
          // Ask user for missing information
          const missingParamsText = missingParams
            .map((p: { name: string; description: string }) => `- ${p.description || p.name}`)
            .join('\n');

          const askForDataMessages = [
            ...sdkMessages,
            {
              role: 'assistant' as const,
              content: `Para ${intentData.action === 'create_product' ? 'crear el producto' : 'completar la acción'}, necesito los siguientes datos:\n${missingParamsText}`,
            },
            {
              role: 'user' as const,
              content: 'Pide al usuario los datos faltantes de forma amigable y específica.',
            },
          ];

          const askResult = await generateText({
            model: openaiModel,
            messages: askForDataMessages,
            temperature: AI_CONFIG.temperature,
          });

          return {
            message: askResult.text,
          };
        }

        // Step 2.2: All required parameters present, execute function
        try {
          const functionResult = await functionToExecute.execute(intentData.parameters);

          // Step 3: Get AI to format the result nicely with the function result context
          const messagesWithResult = [
            ...sdkMessages,
            {
              role: 'assistant' as const,
              content: `He ejecutado ${intentData.action} con los siguientes datos: ${JSON.stringify(functionResult)}`,
            },
            {
              role: 'user' as const,
              content: 'Explica el resultado de forma clara y amigable en español, incluyendo los datos más relevantes.',
            },
          ];

          const responseResult = await generateText({
            model: openaiModel,
            messages: messagesWithResult,
            temperature: AI_CONFIG.temperature,
          });

          return {
            message: responseResult.text,
            functionCall: {
              name: intentData.action,
              arguments: intentData.parameters,
              result: functionResult,
            },
          };
        } catch (error) {
          // Handle execution errors gracefully
          const errorMessages = [
            ...sdkMessages,
            {
              role: 'assistant' as const,
              content: `Error al ejecutar ${intentData.action}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            },
            {
              role: 'user' as const,
              content: 'Explica el error de forma amigable y sugiere cómo resolverlo.',
            },
          ];

          const errorResult = await generateText({
            model: openaiModel,
            messages: errorMessages,
            temperature: AI_CONFIG.temperature,
          });

          return {
            message: errorResult.text,
          };
        }
      }
    }

    // No function call, just conversational response
    const result = await generateText({
      model: openaiModel,
      messages: sdkMessages,
      temperature: AI_CONFIG.temperature,
    });

    return {
      message: result.text,
    };
  }

  /**
   * Validate required parameters for a function
   */
  private validateRequiredParameters(
    func: AIFunction,
    providedParams: any
  ): Array<{ name: string; description: string }> {
    const missing: Array<{ name: string; description: string }> = [];

    Object.entries(func.parameters).forEach(([paramName, config]: [string, any]) => {
      // Check if parameter is required (not optional) and not provided
      if (!config.optional && !providedParams[paramName]) {
        missing.push({
          name: paramName,
          description: config.description || paramName,
        });
      }
    });

    return missing;
  }

  /**
   * Extract intent and entities from user message
   */
  async extractIntent(userMessage: string): Promise<AIIntent> {
    const result = await generateText({
      model: openaiModel,
      messages: [
        {
          role: 'system',
          content: `Eres un asistente que analiza intenciones en comandos de inventario.
Responde SOLO con un JSON válido sin texto adicional. Estructura:
{
  "action": "create_product" | "update_product" | "delete_product" | "get_product" | "list_products" | "search_products" | "unknown",
  "confidence": 0.0 to 1.0,
  "entities": {
    "sku": "código SKU si se menciona",
    "name": "nombre del producto",
    "category": "categoría",
    "description": "descripción",
    "unit": "pcs | kg | liter | meter | box",
    "minStock": número,
    "reorderPoint": número,
    "searchTerm": "término de búsqueda"
  },
  "requiresConfirmation": true si es una acción destructiva como eliminar
}

Solo incluye los campos entities presentes en el mensaje.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.3,
    });

    try {
      // Clean markdown code blocks if present
      let jsonText = result.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\s*$/g, '').trim();
      }

      const parsed = JSON.parse(jsonText);
      return {
        action: (parsed.action || 'unknown') as AIAction,
        confidence: parsed.confidence || 0.0,
        entities: parsed.entities || {},
        requiresConfirmation: parsed.requiresConfirmation || false,
      };
    } catch (error) {
      console.error('Failed to parse AI intent:', error, result.text);
      return {
        action: 'unknown',
        confidence: 0.0,
        entities: {},
        requiresConfirmation: false,
      };
    }
  }

  /**
   * Generate a natural language response
   */
  async generateResponse(context: string, data?: any): Promise<string> {
    const dataStr = data ? JSON.stringify(data, null, 2) : '';
    const result = await generateText({
      model: openaiModel,
      messages: [
        {
          role: 'system',
          content: `Eres un asistente amigable del sistema de inventario Argos.
Genera una respuesta clara y concisa en español, usando emojis ocasionalmente.`,
        },
        {
          role: 'user',
          content: `Contexto: ${context}\n${dataStr ? `Datos: ${dataStr}` : ''}\n\nGenera una respuesta apropiada.`,
        },
      ],
      temperature: 0.7,
    });

    return result.text;
  }

  /**
   * Stream a chat response (for real-time UI updates)
   */
  async *streamChat(
    messages: Message[],
    availableFunctions: AIFunction[]
  ): AsyncIterable<string> {
    const sdkMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Add system message if not present
    if (!sdkMessages.some((m) => m.role === 'system')) {
      sdkMessages.unshift({
        role: 'system',
        content: AI_CONFIG.systemPrompt,
      });
    }

    const result = await streamText({
      model: openaiModel,
      messages: sdkMessages,
      temperature: AI_CONFIG.temperature,
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }
}
