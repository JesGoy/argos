'use client';

import { useState, useEffect, useRef } from 'react';
import { sendMessageAction } from '@/app/(dashboard)/ai-assistant/actions';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  pageContext?: { name: string; description: string };
}

export default function ChatPanel({ isOpen, onToggle, pageContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initConversation = async () => {
      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: 1 }),
        });

        if (!response.ok) {
          throw new Error('No se pudo iniciar conversación');
        }

        const data = await response.json();
        setConversationId(data.id);
        setMessages([
          {
            id: 'initial',
            role: 'assistant',
            content: `👋 ¡Hola! Estoy en la sección de **${pageContext?.name || 'tu aplicación'}**.\n\n${pageContext?.description || 'Puedo ayudarte con cualquier consulta.'}\n\n¿Cómo puedo asistirte?`,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    };

    if (isOpen) {
      initConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !conversationId) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setError('');

    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const messageWithContext = pageContext 
        ? `[Contexto: ${pageContext.name}] ${userMessage}`
        : userMessage;

      const result = await sendMessageAction(1, conversationId, messageWithContext);

      if (result.success) {
        const assistantMsg: ChatMessage = {
          id: result.messageId || Date.now().toString(),
          role: 'assistant',
          content: result.response || 'Sin respuesta',
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setError(result.error || 'Error al procesar el mensaje');
        const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ ${result.error || 'Error al procesar tu mensaje'}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Error de conexión. Por favor intenta de nuevo.',
      };
      setMessages((prev) => [...prev, errorMsg]);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="h-screen bg-white border-l border-gray-200 shadow-lg flex flex-col w-full">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-blue-800">
          <div>
            <h3 className="text-lg font-semibold">Asistente Argos</h3>
            <p className="text-sm text-blue-100">
              {pageContext?.name || 'Gestor de Inventario IA'}
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
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
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
            <p>💡 Prueba: "Crear producto laptop SKU-001"</p>
            <p>💡 O: "Listar productos de electrónica"</p>
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
