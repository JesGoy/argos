import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import { ConversationNotFoundError } from '@/core/domain/errors/AIErrors';

/**
 * Use Case: Delete Conversation
 * Deletes a conversation and all its messages
 */
export class DeleteConversation {
  constructor(
    private readonly deps: {
      conversations: ConversationRepository;
      messages: MessageRepository;
    }
  ) {}

  async execute(conversationId: string): Promise<void> {
    // Verify conversation exists
    const exists = await this.deps.conversations.exists(conversationId);
    if (!exists) {
      throw new ConversationNotFoundError(conversationId);
    }

    // Delete all messages first (cascade should handle this, but being explicit)
    await this.deps.messages.deleteByConversationId(conversationId);

    // Delete the conversation
    await this.deps.conversations.delete(conversationId);
  }
}
