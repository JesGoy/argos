import type { Message, CreateMessageInput } from '@/core/domain/entities/Message';

/**
 * Message Repository Port
 * Contract for message data access operations
 */
export interface MessageRepository {
  /**
   * Find a message by its ID
   */
  findById(id: string): Promise<Message | null>;

  /**
   * Find all messages in a conversation
   */
  findByConversationId(conversationId: string): Promise<Message[]>;

  /**
   * Create a new message
   */
  create(input: CreateMessageInput): Promise<Message>;

  /**
   * Delete a message by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all messages in a conversation
   */
  deleteByConversationId(conversationId: string): Promise<void>;

  /**
   * Get the last N messages from a conversation
   */
  getLastMessages(conversationId: string, limit: number): Promise<Message[]>;
}
