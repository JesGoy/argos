import { eq, desc, and, type SQL } from 'drizzle-orm';
import type { Conversation, CreateConversationInput } from '@/core/domain/entities/Conversation';
import type { ConversationRepository } from '@/core/application/ports/ConversationRepository';
import { getDb } from '@/infra/db/client';
import { conversationTable, type ConversationRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of ConversationRepository, scoped to one organization.
 */
export class ConversationRepositoryDrizzle implements ConversationRepository {
  constructor(private readonly organizationId: number) {}

  private mapToEntity(row: ConversationRow): Conversation {
    return {
      id: String(row.id),
      userId: row.userId,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private orgScope(): SQL {
    return eq(conversationTable.organizationId, this.organizationId);
  }

  async findById(id: string): Promise<Conversation | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(conversationTable)
      .where(and(eq(conversationTable.id, parseInt(id, 10)), this.orgScope()))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async findByUserId(userId: number): Promise<Conversation[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(conversationTable)
      .where(and(eq(conversationTable.userId, userId), this.orgScope()))
      .orderBy(desc(conversationTable.updatedAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateConversationInput): Promise<Conversation> {
    const db = getDb();
    const [row] = await db
      .insert(conversationTable)
      .values({
        organizationId: this.organizationId,
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
      .where(and(eq(conversationTable.id, parseInt(id, 10)), this.orgScope()));
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(conversationTable)
      .where(and(eq(conversationTable.id, parseInt(id, 10)), this.orgScope()));
  }

  async exists(id: string): Promise<boolean> {
    const conversation = await this.findById(id);
    return conversation !== null;
  }

  async belongsToUser(id: string, userId: number): Promise<boolean> {
    const db = getDb();
    const rows = await db
      .select({ id: conversationTable.id })
      .from(conversationTable)
      .where(
        and(
          eq(conversationTable.id, parseInt(id, 10)),
          eq(conversationTable.userId, userId),
          this.orgScope()
        )
      )
      .limit(1);
    return rows.length > 0;
  }
}
