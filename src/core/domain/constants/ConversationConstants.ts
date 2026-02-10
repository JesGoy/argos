/**
 * Message/Conversation Domain Constants
 * Single source of truth for AI conversation values
 */

/**
 * All available message roles
 */
export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;

/**
 * Type representing any valid message role
 */
export type MessageRole = (typeof MESSAGE_ROLES)[number];

/**
 * Message role constants for use in code
 */
export const MESSAGE_ROLE = {
  USER: 'user' as const,
  ASSISTANT: 'assistant' as const,
  SYSTEM: 'system' as const,
} as const;

/**
 * Default conversation history limit
 */
export const CONVERSATION_DEFAULTS = {
  MAX_HISTORY_MESSAGES: 10,
  MAX_TITLE_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 5000,
} as const;
