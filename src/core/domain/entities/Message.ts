/**
 * Message Domain Entity
 * Represents a single message in a conversation
 */
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: MessageMetadata;
  createdAt: Date;
}

/**
 * Metadata associated with a message
 */
export interface MessageMetadata {
  intent?: string;
  entities?: Record<string, unknown>;
  action?: string;
  success?: boolean;
  error?: string;
  executionTime?: number;
  pendingConfirmation?: unknown;
}

/**
 * Input type for creating a message
 */
export type CreateMessageInput = Omit<Message, 'id' | 'createdAt'>;
