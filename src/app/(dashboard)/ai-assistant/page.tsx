import { ChatInterface } from './ChatInterface';
import { createConversationAction } from './actions';
import { requireSession } from '@/app/lib/auth';

export const metadata = {
  title: 'Asistente AI - Argos',
  description: 'Asistente conversacional para gestión de inventario',
};

/**
 * AI Assistant Page
 * Provides a conversational interface to manage inventory
 */
export default async function AIAssistantPage() {
  const session = await requireSession();

  // Create a new conversation on page load
  const result = await createConversationAction();

  if (!result.success || !result.conversation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Error</h2>
          <p className="text-red-600">No se pudo iniciar la conversación. Por favor intenta de nuevo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🤖 Asistente AI de Inventario</h1>
        <p className="text-gray-600 mt-2">
          Gestiona productos de forma conversacional con inteligencia artificial
        </p>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col min-h-0">
        <ChatInterface conversationId={result.conversation.id} />
      </div>

      <div className="mt-4 text-sm text-gray-500 text-center">
        <p>
          Prueba comandos como: "Crear producto", "Listar productos de electrónica", "Actualizar
          stock"
        </p>
      </div>
    </div>
  );
}
