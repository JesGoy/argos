import { NextResponse } from 'next/server';
import { createConversationAction } from '@/app/(dashboard)/ai-assistant/actions';
import { requireSession } from '@/app/lib/auth';
import { AI_ASSISTANT_TEXT } from '@/infra/ai/constants';

export async function POST() {
  try {
    await requireSession();

    const result = await createConversationAction();

    if (!result.success || !result.conversation) {
      return NextResponse.json(
        { error: AI_ASSISTANT_TEXT.START_CONVERSATION_ERROR },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: result.conversation.id,
      userId: result.conversation.userId,
      createdAt: result.conversation.createdAt,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: AI_ASSISTANT_TEXT.CREATE_CONVERSATION_ERROR },
      { status: 500 }
    );
  }
}
