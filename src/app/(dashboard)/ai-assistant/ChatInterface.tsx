'use client';

import { useState } from 'react';
import { sendMessageAction } from './actions';

interface ChatInterfaceProps {
  userId: number;
  conversationId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface({ userId, conversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message immediately
    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // Send message to server
      const result = await sendMessageAction(userId, conversationId, userMessage);

      if (result.success) {
        // Add AI response
        const assistantMsg: ChatMessage = {
          id: result.messageId || Date.now().toString(),
          role: 'assistant',
          content: result.response || '',
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Show error message
        const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ Error: ${result.error}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Error de conexión. Por favor intenta de nuevo.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg">👋 ¡Hola! Soy tu asistente de inventario Argos</p>
            <p className="text-sm mt-2">Puedo ayudarte a crear, actualizar o buscar productos.</p>
            <p className="text-sm mt-1">Prueba con: "Crea un producto laptop con SKU LAP-001"</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
              <p className="animate-pulse">Pensando...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
}
