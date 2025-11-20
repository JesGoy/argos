'use server';

import { makeProcessAICommand, makeCreateConversation } from '@/infra/container/ai';

/**
 * Server Action: Create new conversation
 */
export async function createConversationAction(userId: number) {
  try {
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
export async function sendMessageAction(
  userId: number,
  conversationId: string,
  message: string
) {
  try {
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
