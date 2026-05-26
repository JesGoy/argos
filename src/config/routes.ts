export const APP_ROUTE = {
  LOGIN: '/login',
  REGISTER: '/register',
  PRODUCTS: '/products',
  AI_ASSISTANT: '/ai-assistant',
  POS: '/pos',
  SALES: '/sales',
} as const;

export const API_ROUTE = {
  CONVERSATIONS: '/api/conversations',
} as const;

export const PRODUCT_REVALIDATE_PATHS = [APP_ROUTE.PRODUCTS] as const;
export const STOCK_REVALIDATE_PATHS = [APP_ROUTE.PRODUCTS] as const;
