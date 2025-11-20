/**
 * Domain Error: AI Service Error
 */
export class AIServiceError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(`Error en el servicio de IA: ${message}`);
    this.name = 'AIServiceError';
  }
}

/**
 * Domain Error: Invalid Intent
 */
export class InvalidIntentError extends Error {
  constructor(intent: string) {
    super(`Intención no válida o no reconocida: ${intent}`);
    this.name = 'InvalidIntentError';
  }
}

/**
 * Domain Error: Missing Required Entities
 */
export class MissingEntitiesError extends Error {
  constructor(missingEntities: string[]) {
    super(`Faltan entidades requeridas: ${missingEntities.join(', ')}`);
    this.name = 'MissingEntitiesError';
  }
}

/**
 * Domain Error: Conversation Not Found
 */
export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversación no encontrada: ${conversationId}`);
    this.name = 'ConversationNotFoundError';
  }
}
