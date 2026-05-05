'use client';

import { AI_ASSISTANT_TEXT } from '@/infra/ai/constants';
import { useConversationChat } from '@/components/chat/useConversationChat';

interface ChatInterfaceProps {
  conversationId: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { messages, input, setInput, isLoading, handleSubmit } = useConversationChat({
    conversationId,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg">{AI_ASSISTANT_TEXT.EMPTY_CHAT_TITLE}</p>
            <p className="text-sm mt-2">{AI_ASSISTANT_TEXT.EMPTY_CHAT_DESCRIPTION}</p>
            <p className="text-sm mt-1">{AI_ASSISTANT_TEXT.EMPTY_CHAT_EXAMPLE}</p>
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
              <p className="animate-pulse">{AI_ASSISTANT_TEXT.THINKING}</p>
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
            className="flex-1 px-4 py-2 border text-gray-900 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? AI_ASSISTANT_TEXT.SENDING_BUTTON : AI_ASSISTANT_TEXT.SEND_BUTTON}
          </button>
        </form>
      </div>
    </div>
  );
}
