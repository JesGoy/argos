import { z } from 'zod';

/**
 * Message Role Validation
 */
export const messageRoleSchema = z.enum(['user', 'assistant', 'system']);

/**
 * Create Message Input Schema
 */
export const createMessageSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  role: messageRoleSchema,
  content: z.string().min(1, 'Message content is required'),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Create Conversation Input Schema
 */
export const createConversationSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
});

/**
 * Update Conversation Title Schema
 */
export const updateConversationTitleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
});

/**
 * Type exports
 */
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationTitleInput = z.infer<typeof updateConversationTitleSchema>;
