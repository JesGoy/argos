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
    userId: integer('user_id').notNull(),
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
