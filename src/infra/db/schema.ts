import {
  pgTable,
  pgEnum,
  integer,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Enums
 */
export const unitEnum = pgEnum('unit', ['pcs', 'kg', 'liter', 'meter', 'box']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'warehouse_manager', 'operator', 'viewer']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'transfer', 'mixed']);
export const saleStatusEnum = pgEnum('sale_status', ['pending', 'completed', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['sale', 'purchase', 'adjustment', 'return', 'waste']);
export const businessTypeEnum = pgEnum('business_type', ['food_service', 'retail']);

/**
 * Organization Table (tenant)
 * Every business-data row is scoped to an organization for multi-tenant isolation.
 */
export const organizationTable = pgTable(
  'Organization',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 200 }).notNull(),
    businessType: businessTypeEnum('business_type').notNull().default('food_service'),
    currency: varchar('currency', { length: 3 }).notNull().default('CLP'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('America/Santiago'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export type OrganizationRow = typeof organizationTable.$inferSelect;
export type OrganizationInsert = typeof organizationTable.$inferInsert;

/**
 * User Table
 * Stores application users for authentication and authorization
 */
export const userTable = pgTable(
  'User',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 100 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('viewer'),
    fullName: varchar('full_name', { length: 100 }),
    // Access state: 'active' | 'suspended'. Suspended users keep their data but
    // cannot log in. Stored as text (not an enum) to avoid an ALTER TYPE step.
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex('user_username_idx').on(table.username),
    emailIdx: uniqueIndex('user_email_idx').on(table.email),
    roleIdx: index('user_role_idx').on(table.role),
    organizationIdx: index('user_organization_id_idx').on(table.organizationId),
  })
);

export type UserRow = typeof userTable.$inferSelect;
export type UserInsert = typeof userTable.$inferInsert;

/**
 * Product Table
 * Stores product information for inventory management
 */
export const productTable = pgTable(
  'Product',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 50 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull(),
    unit: unitEnum('unit').notNull().default('pcs'),
    unitCost: integer('unit_cost').notNull().default(0),
    sellingPrice: integer('selling_price').notNull().default(0),
    // Finished good assembled from ingredients (a recipe/BOM). Selling it depletes
    // its components' stock instead of its own. Food-service only.
    isComposite: boolean('is_composite').notNull().default(false),
    minStock: integer('min_stock').notNull().default(0),
    reorderPoint: integer('reorder_point').notNull().default(10),
    defaultSupplierId: integer('default_supplier_id').references(() => supplierTable.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // SKU is unique within an organization, not globally.
    skuIdx: uniqueIndex('product_org_sku_idx').on(table.organizationId, table.sku),
    categoryIdx: index('product_category_idx').on(table.category),
    nameIdx: index('product_name_idx').on(table.name),
    organizationIdx: index('product_organization_id_idx').on(table.organizationId),
    defaultSupplierIdx: index('product_default_supplier_id_idx').on(table.defaultSupplierId),
  })
);

/**
 * Type inference for Product
 */
export type ProductRow = typeof productTable.$inferSelect;
export type ProductInsert = typeof productTable.$inferInsert;

/**
 * Conversation Table
 * Stores conversations between users and AI assistant
 */
export const conversationTable = pgTable(
  'Conversation',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => userTable.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('conversation_user_id_idx').on(table.userId),
    createdAtIdx: index('conversation_created_at_idx').on(table.createdAt),
    organizationIdx: index('conversation_organization_id_idx').on(table.organizationId),
  })
);

/**
 * Message Table
 * Stores individual messages within conversations
 */
export const messageTable = pgTable(
  'Message',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => conversationTable.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index('message_conversation_id_idx').on(table.conversationId),
    createdAtIdx: index('message_created_at_idx').on(table.createdAt),
  })
);

/**
 * Type inference for Conversation
 */
export type ConversationRow = typeof conversationTable.$inferSelect;
export type ConversationInsert = typeof conversationTable.$inferInsert;

/**
 * Type inference for Message
 */
export type MessageRow = typeof messageTable.$inferSelect;
export type MessageInsert = typeof messageTable.$inferInsert;

/**
 * Customer Table
 * Stores customer information for sales tracking
 */
export const customerTable = pgTable(
  'Customer',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    address: text('address'),
    creditLimit: integer('credit_limit').notNull().default(0),
    currentDebt: integer('current_debt').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('customer_name_idx').on(table.name),
    phoneIdx: index('customer_phone_idx').on(table.phone),
    organizationIdx: index('customer_organization_id_idx').on(table.organizationId),
  })
);

export type CustomerRow = typeof customerTable.$inferSelect;
export type CustomerInsert = typeof customerTable.$inferInsert;

/**
 * Sale Table
 * Stores sale transactions
 */
export const saleTable = pgTable(
  'Sale',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    saleNumber: varchar('sale_number', { length: 50 }).notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => userTable.id, { onDelete: 'restrict' }),
    customerId: integer('customer_id').references(() => customerTable.id, { onDelete: 'set null' }),
    totalAmount: integer('total_amount').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    status: saleStatusEnum('status').notNull().default('completed'),
    notes: text('notes'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Sale number is unique within an organization, not globally.
    saleNumberIdx: uniqueIndex('sale_org_number_idx').on(table.organizationId, table.saleNumber),
    userIdIdx: index('sale_user_id_idx').on(table.userId),
    customerIdIdx: index('sale_customer_id_idx').on(table.customerId),
    statusIdx: index('sale_status_idx').on(table.status),
    createdAtIdx: index('sale_created_at_idx').on(table.createdAt),
    organizationIdx: index('sale_organization_id_idx').on(table.organizationId),
  })
);

export type SaleRow = typeof saleTable.$inferSelect;
export type SaleInsert = typeof saleTable.$inferInsert;

/**
 * SaleItem Table
 * Stores individual items within a sale
 */
export const saleItemTable = pgTable(
  'SaleItem',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    saleId: integer('sale_id')
      .notNull()
      .references(() => saleTable.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => productTable.id, { onDelete: 'restrict' }),
    sku: varchar('sku', { length: 50 }).notNull(),
    productName: varchar('product_name', { length: 200 }).notNull(),
    quantity: integer('quantity').notNull(),
    unitPrice: integer('unit_price').notNull(),
    subtotal: integer('subtotal').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    saleIdIdx: index('sale_item_sale_id_idx').on(table.saleId),
    productIdIdx: index('sale_item_product_id_idx').on(table.productId),
    organizationIdx: index('sale_item_organization_id_idx').on(table.organizationId),
  })
);

export type SaleItemRow = typeof saleItemTable.$inferSelect;
export type SaleItemInsert = typeof saleItemTable.$inferInsert;

/**
 * StockTransaction Table
 * Stores all stock movements for inventory tracking
 */
export const stockTransactionTable = pgTable(
  'StockTransaction',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => productTable.id, { onDelete: 'restrict' }),
    type: transactionTypeEnum('type').notNull(),
    quantity: integer('quantity').notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    wasteReason: varchar('waste_reason', { length: 50 }),
    userId: integer('user_id')
      .notNull()
      .references(() => userTable.id, { onDelete: 'restrict' }),
    saleId: integer('sale_id').references(() => saleTable.id, { onDelete: 'set null' }),
    supplierId: integer('supplier_id').references(() => supplierTable.id, { onDelete: 'set null' }),
    /** Per-unit acquisition cost in cents at time of purchase (purchases only). */
    perUnitCost: integer('per_unit_cost'),
    referenceNumber: varchar('reference_number', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index('stock_transaction_product_id_idx').on(table.productId),
    saleIdIdx: index('stock_transaction_sale_id_idx').on(table.saleId),
    supplierIdIdx: index('stock_transaction_supplier_id_idx').on(table.supplierId),
    typeIdx: index('stock_transaction_type_idx').on(table.type),
    createdAtIdx: index('stock_transaction_created_at_idx').on(table.createdAt),
    organizationIdx: index('stock_transaction_organization_id_idx').on(table.organizationId),
  })
);

export type StockTransactionRow = typeof stockTransactionTable.$inferSelect;
export type StockTransactionInsert = typeof stockTransactionTable.$inferInsert;

/**
 * RecipeComponent Table
 * Bill of materials: one ingredient line of a composite (finished-good) product.
 * Self-join on Product: finishedProduct is assembled from ingredientProducts.
 */
export const recipeComponentTable = pgTable(
  'RecipeComponent',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    finishedProductId: integer('finished_product_id')
      .notNull()
      .references(() => productTable.id, { onDelete: 'cascade' }),
    ingredientProductId: integer('ingredient_product_id')
      .notNull()
      .references(() => productTable.id, { onDelete: 'restrict' }),
    quantityPerUnit: integer('quantity_per_unit').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    finishedIdx: index('recipe_component_finished_idx').on(table.finishedProductId),
    organizationIdx: index('recipe_component_organization_id_idx').on(table.organizationId),
    uniqueComponent: uniqueIndex('recipe_component_unique_idx').on(
      table.finishedProductId,
      table.ingredientProductId
    ),
  })
);

export type RecipeComponentRow = typeof recipeComponentTable.$inferSelect;
export type RecipeComponentInsert = typeof recipeComponentTable.$inferInsert;

/**
 * Supplier Table
 * Proveedores. Optional reference on StockTransaction (purchases) and Product (default supplier).
 */
export const supplierTable = pgTable(
  'Supplier',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    leadTimeDays: integer('lead_time_days').notNull().default(7),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index('supplier_organization_id_idx').on(table.organizationId),
    nameIdx: index('supplier_name_idx').on(table.name),
  })
);

export type SupplierRow = typeof supplierTable.$inferSelect;
export type SupplierInsert = typeof supplierTable.$inferInsert;

/**
 * Subscription Table
 * One row per organization (1:1). Tracks plan, billing period and AI-call usage
 * for soft per-plan limits. Period is calendar-month aligned; counter rolls
 * over lazily on read when `currentPeriodEnd` is past.
 */
export const subscriptionTable = pgTable(
  'Subscription',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    organizationId: integer('organization_id')
      .notNull()
      .unique()
      .references(() => organizationTable.id, { onDelete: 'cascade' }),
    plan: text('plan').notNull().default('free'),
    status: text('status').notNull().default('active'),
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    aiCallsUsedThisPeriod: integer('ai_calls_used_this_period').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index('subscription_organization_id_idx').on(table.organizationId),
  })
);

export type SubscriptionRow = typeof subscriptionTable.$inferSelect;
export type SubscriptionInsert = typeof subscriptionTable.$inferInsert;
