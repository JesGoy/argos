import { eq, desc } from 'drizzle-orm';
import type { Conversation, CreateConversationInput } from '@/core/domain/entities/Conversation';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import { getDb } from '@/infra/db/client';
import { conversationTable, type ConversationRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of ConversationRepository
 */
export class ConversationRepositoryDrizzle implements ConversationRepository {
  /**
   * Maps database row to domain entity
   */
  private mapToEntity(row: ConversationRow): Conversation {
    return {
      id: String(row.id),
      userId: row.userId,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: string): Promise<Conversation | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(conversationTable)
      .where(eq(conversationTable.id, parseInt(id, 10)))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async findByUserId(userId: number): Promise<Conversation[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(conversationTable)
      .where(eq(conversationTable.userId, userId))
      .orderBy(desc(conversationTable.updatedAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateConversationInput): Promise<Conversation> {
    const db = getDb();
    const [row] = await db
      .insert(conversationTable)
      .values({
        userId: input.userId,
        title: input.title,
        updatedAt: new Date(),
      })
      .returning();

    return this.mapToEntity(row);
  }

  async updateTitle(id: string, title: string): Promise<void> {
    const db = getDb();
    await db
      .update(conversationTable)
      .set({
        title,
        updatedAt: new Date(),
      })
      .where(eq(conversationTable.id, parseInt(id, 10)));
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(conversationTable)
      .where(eq(conversationTable.id, parseInt(id, 10)));
  }

  async exists(id: string): Promise<boolean> {
    const conversation = await this.findById(id);
    return conversation !== null;
  }
}
