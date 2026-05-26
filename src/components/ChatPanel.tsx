'use client';

import { useEffect, useRef, useState } from 'react';
import { API_ROUTE } from '@/config/routes';
import {
  AI_ASSISTANT_TEXT,
  AI_CHAT_HINTS,
  AI_CHAT_MESSAGE_ID,
  AI_CONTEXT_TEXT,
} from '@/infra/ai/constants';
import { useConversationChat } from '@/components/chat/useConversationChat';

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  pageContext?: { name: string; description: string };
}

export default function ChatPanel({ isOpen, onToggle, pageContext }: ChatPanelProps) {
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    error,
    setError,
    handleSubmit,
  } = useConversationChat({
    conversationId,
    formatOutgoingMessage: (message) =>
      pageContext
        ? `${AI_CONTEXT_TEXT.PREFIX}${pageContext.name}${AI_CONTEXT_TEXT.SUFFIX}${message}`
        : message,
  });

  useEffect(() => {
    const initConversation = async () => {
      try {
        const response = await fetch(API_ROUTE.CONVERSATIONS, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(AI_ASSISTANT_TEXT.CONVERSATION_INIT_ERROR);
        }

        const data = await response.json();
        setConversationId(data.id);
        setMessages([
          {
            id: AI_CHAT_MESSAGE_ID.INITIAL,
            role: 'assistant',
            content: `👋 ¡Hola! Estoy en la sección de **${pageContext?.name || 'tu aplicación'}**.\n\n${pageContext?.description || 'Puedo ayudarte con cualquier consulta.'}\n\n¿Cómo puedo asistirte?`,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : AI_ASSISTANT_TEXT.UNKNOWN_ERROR);
      }
    };

    if (isOpen) {
      initConversation();
    }
  }, [isOpen, pageContext?.description, pageContext?.name, setError, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <div className="h-screen bg-white border-l border-gray-200 shadow-lg flex flex-col w-full">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-blue-800">
          <div>
            <h3 className="text-lg font-semibold">{AI_ASSISTANT_TEXT.PANEL_TITLE}</h3>
            <p className="text-sm text-blue-100">
              {pageContext?.name || AI_ASSISTANT_TEXT.DEFAULT_PANEL_CONTEXT}
            </p>
          </div>
          <button
            onClick={onToggle}
            className="hover:bg-blue-800 rounded-lg p-2 transition-colors"
            aria-label="Cerrar panel"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-900 rounded-lg rounded-bl-none px-4 py-2">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t bg-white p-4 space-y-3 flex-shrink-0">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading || !conversationId}
              className="text-gray-900 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !conversationId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg px-3 py-2 transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            {AI_CHAT_HINTS.map((hint) => (
              <p key={hint}>{hint}</p>
            ))}
          </div>
        </form>
      </div>

      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
          aria-label="Abrir asistente de IA"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="absolute bottom-16 right-0 bg-gray-900 text-white text-sm rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Asistente IA
          </span>
        </button>
      )}
    </>
  );
}
