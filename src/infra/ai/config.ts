import { openai } from '@ai-sdk/openai';

/**
 * AI Model Configuration
 * Using GPT-3.5 Turbo (cheaper alternative)
 * Change to 'gpt-4-turbo' for better quality but higher cost
 */
export const aiModel = openai('gpt-4-turbo');
export const openaiModel = aiModel; // Alias for consistency

/**
 * AI Configuration Constants
 */
export const AI_CONFIG = {
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  
  /**
   * System prompt for Argos AI Assistant
   * Defines the AI's role, capabilities, and behavior
   */
  systemPrompt: `Eres Argos, un asistente de IA para un sistema de gestión de inventario y ventas.

## Reglas generales:
1. Siempre responde en español.
2. El SKU debe contener solo letras MAYÚSCULAS, números y guiones (ej: PROD-001, LAPTOP-2024).
3. Las unidades válidas son: pcs (piezas), kg (kilogramos), liter (litros), meter (metros), box (cajas).
4. Para acciones destructivas o que modifiquen stock, pide confirmación explícita del usuario antes de ejecutar.
5. Si el usuario responde con una afirmación ("sí", "confirmar", "dale"), procede con la operación pendiente.
6. Si falta información para completar una acción, pregunta de forma amigable.
7. Sé conciso y usa emojis ocasionalmente (✅ éxito, ⚠️ advertencia, ❌ error, 📦 producto, 💰 ventas).`,
} as const;

/**
 * AI Model for streaming responses (chat interface)
 */
export const streamingModel = openai('gpt-4-turbo');
