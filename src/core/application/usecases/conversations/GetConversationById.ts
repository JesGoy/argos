import type { Conversation } from '@/core/domain/entities/Conversation';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import { ConversationNotFoundError } from '@/core/domain/errors/AIErrors';

/**
 * Use Case: Get Conversation By ID
 * Retrieves a specific conversation by its ID
 */
export class GetConversationById {
  constructor(
    private readonly deps: {
      conversations: ConversationRepository;
    }
  ) {}

  async execute(conversationId: string): Promise<Conversation> {
    const conversation = await this.deps.conversations.findById(conversationId);

    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    return conversation;
  }
}
