'use server';

import { makeProcessAICommand, makeCreateConversation } from '@/infra/container/ai';
import { requireSession } from '@/app/lib/auth';

/**
 * Server Action: Create new conversation
 */
export async function createConversationAction() {
  try {
    const session = await requireSession();
    const userId = Number(session.userId);
    if (Number.isNaN(userId)) {
      throw new Error('ID de usuario inválido');
    }

    const createConversation = makeCreateConversation();
    const conversation = await createConversation.execute({
      userId,
      title: 'Nueva Conversación',
    });

    return {
      success: true,
      conversation,
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error creating conversation',
    };
  }
}

/**
 * Server Action: Send message and get AI response
 */
export async function sendMessageAction(conversationId: string, message: string) {
  try {
    const session = await requireSession();
    const userId = Number(session.userId);
    if (Number.isNaN(userId)) {
      throw new Error('ID de usuario inválido');
    }

    const processCommand = makeProcessAICommand();
    const result = await processCommand.execute({
      userId,
      conversationId,
      message,
    });

    return {
      success: true,
      response: result.response,
      messageId: result.messageId,
      actionPerformed: result.actionPerformed,
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error processing message',
    };
  }
}
