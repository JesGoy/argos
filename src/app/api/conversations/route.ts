import { NextRequest, NextResponse } from 'next/server';
import { createConversationAction } from '@/app/(dashboard)/ai-assistant/actions';
import { requireSession } from '@/app/lib/auth';

export async function POST(_request: NextRequest) {
  try {
    await requireSession();

    const result = await createConversationAction();

    if (!result.success || !result.conversation) {
      return NextResponse.json(
        { error: 'No se pudo crear la conversación' },
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
      { error: 'Error al crear la conversación' },
      { status: 500 }
    );
  }
}
