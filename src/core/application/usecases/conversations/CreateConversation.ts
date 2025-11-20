import type { Conversation } from '@/core/domain/entities/Conversation';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';

/**
 * Input for CreateConversation
 */
export interface CreateConversationInput {
  userId: number;
  title: string;
  initialMessage?: string;
}

/**
 * Use Case: Create Conversation
 * Creates a new conversation and optionally adds an initial message
 */
export class CreateConversation {
  constructor(
    private readonly deps: {
      conversations: ConversationRepository;
      messages: MessageRepository;
    }
  ) {}

  async execute(input: CreateConversationInput): Promise<Conversation> {
    // Create the conversation
    const conversation = await this.deps.conversations.create({
      userId: input.userId,
      title: input.title,
    });

    // Add initial message if provided
    if (input.initialMessage) {
      await this.deps.messages.create({
        conversationId: conversation.id,
        role: 'user',
        content: input.initialMessage,
      });
    }

    return conversation;
  }
}
