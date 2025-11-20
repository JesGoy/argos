import { eq, desc } from 'drizzle-orm';
import type { Message, CreateMessageInput } from '@/core/domain/entities/Message';
import type { MessageRepository } from '@/core/application/ports/MessageRepository';
import { getDb } from '@/infra/db/client';
import { messageTable, type MessageRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of MessageRepository
 */
export class MessageRepositoryDrizzle implements MessageRepository {
  /**
   * Maps database row to domain entity
   */
  private mapToEntity(row: MessageRow): Message {
    return {
      id: String(row.id),
      conversationId: String(row.conversationId),
      role: row.role,
      content: row.content,
      metadata: row.metadata as any,
      createdAt: row.createdAt,
    };
  }

  async findById(id: string): Promise<Message | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.id, parseInt(id, 10)))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.conversationId, parseInt(conversationId, 10)))
      .orderBy(messageTable.createdAt);

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateMessageInput): Promise<Message> {
    const db = getDb();
    const [row] = await db
      .insert(messageTable)
      .values({
        conversationId: parseInt(input.conversationId, 10),
        role: input.role,
        content: input.content,
        metadata: input.metadata as any,
      })
      .returning();

    return this.mapToEntity(row);
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(messageTable)
      .where(eq(messageTable.id, parseInt(id, 10)));
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    const db = getDb();
    await db
      .delete(messageTable)
      .where(eq(messageTable.conversationId, parseInt(conversationId, 10)));
  }

  async getLastMessages(conversationId: string, limit: number): Promise<Message[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.conversationId, parseInt(conversationId, 10)))
      .orderBy(desc(messageTable.createdAt))
      .limit(limit);

    // Reverse to get chronological order (oldest first)
    return rows.reverse().map((row) => this.mapToEntity(row));
  }
}
