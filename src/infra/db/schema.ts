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
 * Password Reset Table
 * Stores one-time PINs used for password recovery
 */
export const passwordResetTable = pgTable(
  'PasswordReset',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => userTable.id, { onDelete: 'cascade' }),
    pin: varchar('pin', { length: 6 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    used: pgEnum('password_reset_used', ['true', 'false'])('used').default('false').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('password_reset_user_id_idx').on(table.userId),
    pinIdx: index('password_reset_pin_idx').on(table.pin),
    createdAtIdx: index('password_reset_created_at_idx').on(table.createdAt),
  })
);

export type PasswordResetRow = typeof passwordResetTable.$inferSelect;
export type PasswordResetInsert = typeof passwordResetTable.$inferInsert;
