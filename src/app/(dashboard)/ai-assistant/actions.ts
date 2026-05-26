'use server';

import { revalidatePath } from 'next/cache';
import { makeProcessAICommand, makeCreateConversation } from '@/infra/container/ai';
import { requireSession } from '@/app/lib/auth';
import { AI_ASSISTANT_TEXT } from '@/infra/ai/constants';

export interface SendMessageActionResult {
  success: boolean;
  response?: string;
  messageId?: string;
  actionPerformed?: string;
  shouldRefreshUi?: boolean;
  error?: string;
}

/**
 * Server Action: Create new conversation
 */
export async function createConversationAction() {
  try {
    const session = await requireSession();
    const userId = Number(session.userId);
    if (Number.isNaN(userId)) {
      throw new Error(AI_ASSISTANT_TEXT.INVALID_USER_ID);
    }

    const createConversation = makeCreateConversation();
    const conversation = await createConversation.execute({
      userId,
      title: AI_ASSISTANT_TEXT.NEW_CONVERSATION_TITLE,
    });

    return {
      success: true,
      conversation,
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : AI_ASSISTANT_TEXT.CREATE_CONVERSATION_ERROR,
    };
  }
}

/**
 * Server Action: Send message and get AI response
 */
export async function sendMessageAction(
  conversationId: string,
  message: string
): Promise<SendMessageActionResult> {
  try {
    const session = await requireSession();
    const userId = Number(session.userId);
    if (Number.isNaN(userId)) {
      throw new Error(AI_ASSISTANT_TEXT.INVALID_USER_ID);
    }

    const processCommand = makeProcessAICommand();
    const result = await processCommand.execute({
      userId,
      userRole: session.role,
      conversationId,
      message,
    });

    result.refreshPaths.forEach((path) => revalidatePath(path));

    return {
      success: true,
      response: result.response,
      messageId: result.messageId,
      actionPerformed: result.actionPerformed,
      shouldRefreshUi: result.shouldRefreshUi,
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : AI_ASSISTANT_TEXT.PROCESS_MESSAGE_ERROR,
    };
  }
}
