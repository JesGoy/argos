import type { Message } from '@/core/domain/entities/Message';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import { ConversationNotFoundError } from '@/core/domain/errors/AIErrors';

/**
 * Use Case: Get Conversation Messages
 * Retrieves all messages in a conversation
 */
export class GetConversationMessages {
  constructor(
    private readonly deps: {
      conversations: ConversationRepository;
      messages: MessageRepository;
    }
  ) {}

  async execute(conversationId: string): Promise<Message[]> {
    // Verify conversation exists
    const exists = await this.deps.conversations.exists(conversationId);
    if (!exists) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Get all messages ordered by creation time
    const messages = await this.deps.messages.findByConversationId(conversationId);

    return messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }
}
