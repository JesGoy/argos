import type { Conversation } from '@/core/domain/entities/Conversation';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';

/**
 * Use Case: Get Conversation History
 * Retrieves all conversations for a user, ordered by most recent
 */
export class GetConversationHistory {
  constructor(
    private readonly deps: {
      conversations: ConversationRepository;
    }
  ) {}

  async execute(userId: number): Promise<Conversation[]> {
    const conversations = await this.deps.conversations.findByUserId(userId);

    // Sort by most recent first
    return conversations.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }
}
