import type { Conversation, CreateConversationInput } from '@/core/domain/entities/Conversation';

/**
 * Conversation Repository Port
 * Contract for conversation data access operations
 */
export interface ConversationRepository {
  /**
   * Find a conversation by its ID
   */
  findById(id: string): Promise<Conversation | null>;

  /**
   * Find all conversations for a specific user
   */
  findByUserId(userId: number): Promise<Conversation[]>;

  /**
   * Create a new conversation
   */
  create(input: CreateConversationInput): Promise<Conversation>;

  /**
   * Update conversation title
   */
  updateTitle(id: string, title: string): Promise<void>;

  /**
   * Delete a conversation by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a conversation exists
   */
  exists(id: string): Promise<boolean>;
}
