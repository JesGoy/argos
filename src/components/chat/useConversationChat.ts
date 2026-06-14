'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AI_ASSISTANT_TEXT } from '@/infra/ai/constants';
import type { ChatMessage } from '@/components/chat/types';

interface UseConversationChatOptions {
  conversationId: string;
  formatOutgoingMessage?: (message: string) => string;
}

type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'done'; response: string; messageId: string; actionPerformed?: string; shouldRefreshUi?: boolean }
  | { type: 'error'; message: string };

interface SyncResponseBody {
  streamed: false;
  response: string;
  messageId: string;
  actionPerformed?: string;
  shouldRefreshUi?: boolean;
}

/**
 * Append the streaming assistant placeholder and return its id. The id is used
 * both to update the placeholder with deltas and to swap in the canonical text
 * when the server emits `done` (which may differ from the streamed deltas when
 * a formatter overrides the model's narration).
 */
function appendStreamingPlaceholder(setMessages: (updater: (cur: ChatMessage[]) => ChatMessage[]) => void): string {
  const placeholderId = `assistant-${Date.now()}`;
  setMessages((cur) => [...cur, { id: placeholderId, role: 'assistant', content: '' }]);
  return placeholderId;
}

function replaceMessage(
  setMessages: (updater: (cur: ChatMessage[]) => ChatMessage[]) => void,
  id: string,
  patch: Partial<ChatMessage>
) {
  setMessages((cur) => cur.map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

function appendDelta(
  setMessages: (updater: (cur: ChatMessage[]) => ChatMessage[]) => void,
  id: string,
  delta: string
) {
  setMessages((cur) => cur.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)));
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
    setMessages((cur) => [
      ...cur,
      { id: `user-${Date.now()}`, role: 'user', content: userMessage },
    ]);

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: outgoingMessage }),
      });

      if (!response.ok) {
        let errorMessage: string = AI_ASSISTANT_TEXT.PROCESS_MESSAGE_ERROR;
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) errorMessage = data.error;
        } catch {
          // body wasn't JSON; keep default.
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type') ?? '';

      // Confirmation reply path: server skipped the model and returned a
      // single JSON payload with the final assistant text.
      if (contentType.includes('application/json')) {
        const data = (await response.json()) as SyncResponseBody;
        setMessages((cur) => [
          ...cur,
          {
            id: data.messageId,
            role: 'assistant',
            content: data.response ?? AI_ASSISTANT_TEXT.NO_RESPONSE,
          },
        ]);
        if (data.shouldRefreshUi) router.refresh();
        return;
      }

      if (!response.body) {
        throw new Error(AI_ASSISTANT_TEXT.CONNECTION_ERROR);
      }

      const placeholderId = appendStreamingPlaceholder(setMessages);
      await consumeSseStream(response.body, {
        onText: (delta) => appendDelta(setMessages, placeholderId, delta),
        onDone: (event) => {
          replaceMessage(setMessages, placeholderId, {
            id: event.messageId,
            content: event.response ?? AI_ASSISTANT_TEXT.NO_RESPONSE,
          });
          if (event.shouldRefreshUi) router.refresh();
        },
        onError: (message) => {
          setError(message);
          replaceMessage(setMessages, placeholderId, { content: `❌ ${message}` });
        },
      });
    } catch (err) {
      const fallback = err instanceof Error ? err.message : AI_ASSISTANT_TEXT.CONNECTION_ERROR;
      setError(fallback);
      setMessages((cur) => [
        ...cur,
        { id: `assistant-error-${Date.now()}`, role: 'assistant', content: `❌ ${fallback}` },
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

/**
 * Parse an SSE byte stream into typed events and dispatch them. Each event is
 * a `data: {json}\n\n` frame. We buffer across chunks so a frame split across
 * TCP packets is still parsed as one.
 */
async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onText: (delta: string) => void;
    onDone: (event: Extract<StreamEvent, { type: 'done' }>) => void;
    onError: (message: string) => void;
  }
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex !== -1) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
      if (dataLine) {
        const payload = dataLine.slice(5).trim();
        if (payload) {
          try {
            const event = JSON.parse(payload) as StreamEvent;
            if (event.type === 'text') handlers.onText(event.delta);
            else if (event.type === 'done') handlers.onDone(event);
            else if (event.type === 'error') handlers.onError(event.message);
          } catch {
            // Malformed frame — skip it rather than killing the whole stream.
          }
        }
      }

      separatorIndex = buffer.indexOf('\n\n');
    }
  }
}
