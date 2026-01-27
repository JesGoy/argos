import { eq } from 'drizzle-orm';
import type { PasswordReset, CreatePasswordResetInput } from '@/core/domain/entities/PasswordReset';
import type { PasswordResetRepository } from '@/core/application/ports/PasswordResetRepository';
import { getDb } from '@/infra/db/client';
import { passwordResetTable, type PasswordResetRow } from '@/infra/db/schema';

export class PasswordResetRepositoryDrizzle implements PasswordResetRepository {
  private map(row: PasswordResetRow): PasswordReset {
    return {
      id: String(row.id),
      userId: String(row.userId),
      pin: row.pin,
      expiresAt: new Date(row.expiresAt),
      used: String(row.used) === 'true',
      createdAt: new Date(row.createdAt),
    };
  }

  async create(input: CreatePasswordResetInput): Promise<PasswordReset> {
    const db = getDb();
    const [row] = await db
      .insert(passwordResetTable)
      .values({
        userId: parseInt(input.userId, 10),
        pin: input.pin,
        expiresAt: input.expiresAt,
        used: 'false',
      })
      .returning();

    return this.map(row);
  }

  async findByPin(pin: string): Promise<PasswordReset | undefined> {
    const db = getDb();
    const [row] = await db.select().from(passwordResetTable).where(eq(passwordResetTable.pin, pin)).limit(1);
    return row ? this.map(row) : undefined;
  }

  async findById(id: string): Promise<PasswordReset | undefined> {
    const db = getDb();
    const [row] = await db.select().from(passwordResetTable).where(eq(passwordResetTable.id, parseInt(id, 10))).limit(1);
    return row ? this.map(row) : undefined;
  }

  async markAsUsed(id: string): Promise<void> {
    const db = getDb();
    await db.update(passwordResetTable).set({ used: 'true' }).where(eq(passwordResetTable.id, parseInt(id, 10)));
  }

  async deleteById(id: string): Promise<void> {
    const db = getDb();
    await db.delete(passwordResetTable).where(eq(passwordResetTable.id, parseInt(id, 10)));
  }
}
