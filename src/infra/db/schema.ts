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
} from 'drizzle-orm/pg-core';

/**
 * Enums
 */
export const unitEnum = pgEnum('unit', ['pcs', 'kg', 'liter', 'meter', 'box']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'warehouse_manager', 'operator', 'viewer']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'transfer', 'mixed']);
export const saleStatusEnum = pgEnum('sale_status', ['pending', 'completed', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['sale', 'purchase', 'adjustment', 'return']);

/**
 * User Table
 * Stores application users for authentication and authorization
 */
export const userTable = pgTable(
  'User',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 100 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('viewer'),
    fullName: varchar('full_name', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex('user_username_idx').on(table.username),
    emailIdx: uniqueIndex('user_email_idx').on(table.email),
    roleIdx: index('user_role_idx').on(table.role),
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
    sku: varchar('sku', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull(),
    unit: unitEnum('unit').notNull().default('pcs'),
    currentStock: integer('current_stock').notNull().default(0),
    minStock: integer('min_stock').notNull().default(0),
    reorderPoint: integer('reorder_point').notNull().default(10),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    skuIdx: uniqueIndex('product_sku_idx').on(table.sku),
    categoryIdx: index('product_category_idx').on(table.category),
    nameIdx: index('product_name_idx').on(table.name),
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
    saleNumber: varchar('sale_number', { length: 50 }).notNull().unique(),
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
    saleNumberIdx: uniqueIndex('sale_number_idx').on(table.saleNumber),
    userIdIdx: index('sale_user_id_idx').on(table.userId),
    customerIdIdx: index('sale_customer_id_idx').on(table.customerId),
    statusIdx: index('sale_status_idx').on(table.status),
    createdAtIdx: index('sale_created_at_idx').on(table.createdAt),
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
    productId: integer('product_id')
      .notNull()
      .references(() => productTable.id, { onDelete: 'restrict' }),
    type: transactionTypeEnum('type').notNull(),
    quantity: integer('quantity').notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => userTable.id, { onDelete: 'restrict' }),
    saleId: integer('sale_id').references(() => saleTable.id, { onDelete: 'set null' }),
    referenceNumber: varchar('reference_number', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index('stock_transaction_product_id_idx').on(table.productId),
    saleIdIdx: index('stock_transaction_sale_id_idx').on(table.saleId),
    typeIdx: index('stock_transaction_type_idx').on(table.type),
    createdAtIdx: index('stock_transaction_created_at_idx').on(table.createdAt),
  })
);

export type StockTransactionRow = typeof stockTransactionTable.$inferSelect;
export type StockTransactionInsert = typeof stockTransactionTable.$inferInsert;
