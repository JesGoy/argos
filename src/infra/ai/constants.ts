export const AI_ACTION = {
  GET_SALES_TODAY: 'get_sales_today',
} as const;

export const AI_RESPONSE_ICON = {
  SUCCESS: '✅',
  PRODUCT: '📦',
  WARNING: '⚠️',
  SEARCH: '🔍',
  ERROR: '❌',
  SALES: '💰',
} as const;

export const AI_ASSISTANT_TEXT = {
  NEW_CONVERSATION_TITLE: 'Nueva Conversación',
  INVALID_USER_ID: 'ID de usuario inválido',
  CREATE_CONVERSATION_ERROR: 'Error creating conversation',
  PROCESS_MESSAGE_ERROR: 'Error processing message',
  START_CONVERSATION_ERROR: 'No se pudo iniciar la conversación. Por favor intenta de nuevo.',
  CONVERSATION_INIT_ERROR: 'No se pudo iniciar conversación',
  UNKNOWN_ERROR: 'Error desconocido',
  NO_RESPONSE: 'Sin respuesta',
  CONNECTION_ERROR: 'Error de conexión. Por favor intenta de nuevo.',
  DEFAULT_PANEL_CONTEXT: 'Gestor de Inventario IA',
  PANEL_TITLE: 'Asistente Argos',
  PAGE_TITLE: 'Asistente AI de Inventario',
  PAGE_DESCRIPTION: 'Gestiona productos de forma conversacional con inteligencia artificial',
  PAGE_HINT:
    'Prueba comandos como: "Crear producto", "Listar productos de electrónica", "Actualizar stock"',
  EMPTY_CHAT_TITLE: '👋 ¡Hola! Soy tu asistente de inventario Argos',
  EMPTY_CHAT_DESCRIPTION: 'Puedo ayudarte a crear, actualizar o buscar productos.',
  EMPTY_CHAT_EXAMPLE: 'Prueba con: "Crea un producto laptop con SKU LAP-001"',
  SEND_BUTTON: 'Enviar',
  SENDING_BUTTON: 'Enviando...',
  THINKING: 'Pensando...',
} as const;

export const AI_CONTEXT_TEXT = {
  PREFIX: '[Contexto: ',
  SUFFIX: '] ',
} as const;

export const AI_PRODUCT_MESSAGE_PATTERNS = {
  MIN_STOCK: [
    /(?:stock\s*(?:m[ií]n(?:imo)?|min)|(?:m[ií]n(?:imo)?|min)\s*stock)\s*(?:de|a|en|es|:)?\s*(\d+)/i,
    /(?:con|y)\s*(\d+)\s*(?:de\s*)?(?:stock\s*(?:m[ií]n(?:imo)?|min)|(?:m[ií]n(?:imo)?|min)\s*stock)/i,
    /(?:stock\s*(?:m[ií]n(?:imo)?|min)|(?:m[ií]n(?:imo)?|min)\s*stock)(?:\s+de\s+[^,.;]+?)\s*(?:a|en|es|:)\s*(\d+)/i,
  ],
  REORDER_POINT: [
    /(?:punto\s*de\s*reorden|reorden|reorder\s*point)\s*(?:de|a|en|es|:)?\s*(\d+)/i,
    /(?:con|y)\s*(\d+)\s*(?:de\s*)?(?:punto\s*de\s*reorden|reorden|reorder\s*point)/i,
    /(?:punto\s*de\s*reorden|reorden|reorder\s*point)(?:\s+de\s+[^,.;]+?)\s*(?:a|en|es|:)\s*(\d+)/i,
  ],
} as const;

export const AI_CHAT_HINTS = [
  '💡 Prueba: "Crear producto laptop SKU-001"',
  '💡 O: "Listar productos de electrónica"',
] as const;

export const AI_CHAT_MESSAGE_ID = {
  INITIAL: 'initial',
} as const;

export const AI_RESPONSE_MESSAGE = {
  CONFIRMATION_CANCELLED: (action: string, sku: string, productName: string) =>
    `Operación cancelada. No ejecuté ${action} para ${sku} (${productName}).`,
  CONFIRMATION_REQUIRED: (action: string, sku: string, productName: string) =>
    `Necesito una confirmación explícita para ${action} en ${sku} (${productName}). Responde "sí" para confirmar o "no" para cancelar.`,
} as const;
