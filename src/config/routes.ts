export const APP_ROUTE = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PRODUCTS: '/products',
  AI_ASSISTANT: '/ai-assistant',
  POS: '/pos',
  SALES: '/sales',
  MERMAS: '/mermas',
  SUPPLIERS: '/suppliers',
  STOCK_IN: '/stock-in',
  SETTINGS: '/settings',
  BILLING: '/settings/billing',
  USERS: '/users',
  ONBOARDING: '/onboarding',
  TERMS: '/legal/terms',
  PRIVACY: '/legal/privacy',
  DPA: '/legal/dpa',
} as const;

export const API_ROUTE = {
  CONVERSATIONS: '/api/conversations',
} as const;

export const PRODUCT_REVALIDATE_PATHS = [APP_ROUTE.PRODUCTS] as const;
export const STOCK_REVALIDATE_PATHS = [APP_ROUTE.PRODUCTS, APP_ROUTE.MERMAS, APP_ROUTE.STOCK_IN] as const;
export const SALES_REVALIDATE_PATHS = [
  APP_ROUTE.POS,
  APP_ROUTE.SALES,
  APP_ROUTE.PRODUCTS,
  APP_ROUTE.DASHBOARD,
] as const;
export const SUPPLIER_REVALIDATE_PATHS = [APP_ROUTE.SUPPLIERS, APP_ROUTE.STOCK_IN] as const;
export const USER_REVALIDATE_PATHS = [APP_ROUTE.USERS] as const;
