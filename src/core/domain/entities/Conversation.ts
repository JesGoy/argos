/**
 * Conversation Domain Entity
 * Represents a conversation between user and AI assistant
 */
export interface Conversation {
  id: string;
  userId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input type for creating a conversation
 */
export type CreateConversationInput = Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>;
