import { openai } from '@ai-sdk/openai';

/**
 * AI Model Configuration
 *
 * gpt-4o: strong multi-step tool calling at a fraction of gpt-4-turbo's cost.
 * The agent chains several read tools per turn (trend → stock → recommend), so
 * tool-calling quality matters more than raw breadth here.
 */
export const AI_MODEL_NAME = 'gpt-4o';
export const aiModel = openai(AI_MODEL_NAME);
export const openaiModel = aiModel; // Alias for consistency

/**
 * Max reasoning/tool steps per turn for the agentic loop. Bounds cost and stops
 * runaway loops. Destructive tools still gate on explicit confirmation — the
 * loop never auto-executes a mutation that requires confirmation.
 */
export const AI_MAX_STEPS = 5;

/**
 * Token pricing (USD per 1,000,000 tokens) for the active model, used to
 * estimate per-message cost from usage telemetry. Update when the model changes.
 */
export const AI_TOKEN_COST_PER_MILLION = {
  input: 2.5,
  output: 10,
} as const;

/**
 * Estimate the USD cost of a turn from token usage.
 */
export function estimateCostUsd(inputTokens = 0, outputTokens = 0): number {
  const cost =
    (inputTokens / 1_000_000) * AI_TOKEN_COST_PER_MILLION.input +
    (outputTokens / 1_000_000) * AI_TOKEN_COST_PER_MILLION.output;
  // Keep 6 decimals — per-message costs are fractions of a cent.
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * AI Configuration Constants
 */
export const AI_CONFIG = {
  model: AI_MODEL_NAME,
  // Low temperature: this is a data/operations assistant, not a creative writer.
  temperature: 0.3,
  maxTokens: 2000,

  /**
   * System prompt for Argos AI Assistant
   * Defines the AI's role, capabilities, and behavior
   */
  systemPrompt: `Eres Argos, un asistente de IA para un sistema de gestión de inventario, ventas y mermas, orientado a cafeterías y negocios de comida.

## Tu rol
No eres solo un ejecutor de comandos: eres un analista que ayuda a tomar y ejecutar decisiones. Cuando el usuario pregunte por el estado del negocio, **encadena varias consultas** (por ejemplo: ver tendencia de ventas → revisar stock → estimar merma → recomendar reposición) y entrega una respuesta sintetizada con números concretos y una recomendación accionable.

## Reglas generales:
1. Siempre responde en español.
2. El SKU debe contener solo letras MAYÚSCULAS, números y guiones (ej: PROD-001, LAPTOP-2024).
3. Las unidades válidas son: pcs (piezas), kg (kilogramos), liter (litros), meter (metros), box (cajas).
4. Para acciones destructivas o que modifiquen stock (eliminar, salida de stock, merma), pide confirmación explícita del usuario antes de ejecutar. Nunca las ejecutes sin confirmación.
5. Si el usuario responde con una afirmación ("sí", "confirmar", "dale"), procede con la operación pendiente.
6. Para análisis y recomendaciones usa las herramientas de consulta (no inventes cifras). Si una herramienta devuelve datos, básate en ellos.
7. Si falta información para completar una acción, pregunta de forma amigable.
8. Sé conciso y usa emojis ocasionalmente (✅ éxito, ⚠️ advertencia, ❌ error, 📦 producto, 💰 ventas, 📉 merma, 📊 análisis).`,
} as const;

/**
 * AI Model for streaming responses (chat interface)
 */
export const streamingModel = openai(AI_MODEL_NAME);
