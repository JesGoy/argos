'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sendMessageAction } from '@/app/(dashboard)/ai-assistant/actions';
import { AI_ASSISTANT_TEXT } from '@/infra/ai/constants';
import type { ChatMessage } from '@/components/chat/types';

interface UseConversationChatOptions {
  conversationId: string;
  formatOutgoingMessage?: (message: string) => string;
}

export function useConversationChat({
  conversationId,
  formatOutgoingMessage,
}: UseConversationChatOptions) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isLoading || !conversationId) {
      return;
    }

    const userMessage = input.trim();
    const outgoingMessage = formatOutgoingMessage
      ? formatOutgoingMessage(userMessage)
      : userMessage;

    setInput('');
    setIsLoading(true);
    setError('');
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
      },
    ]);

    try {
      const result = await sendMessageAction(conversationId, outgoingMessage);

      if (result.success) {
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: result.messageId ?? Date.now().toString(),
            role: 'assistant',
            content: result.response ?? AI_ASSISTANT_TEXT.NO_RESPONSE,
          },
        ]);

        if (result.shouldRefreshUi) {
          router.refresh();
        }

        return;
      }

      const errorMessage = result.error ?? AI_ASSISTANT_TEXT.PROCESS_MESSAGE_ERROR;
      setError(errorMessage);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ ${errorMessage}`,
        },
      ]);
    } catch {
      setError(AI_ASSISTANT_TEXT.CONNECTION_ERROR);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ ${AI_ASSISTANT_TEXT.CONNECTION_ERROR}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    error,
    setError,
    handleSubmit,
  };
}
