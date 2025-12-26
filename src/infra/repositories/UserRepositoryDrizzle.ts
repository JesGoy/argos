import { eq } from 'drizzle-orm';
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
} from '@/core/domain/entities/User';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import { getDb } from '@/infra/db/client';
import { userTable, type UserRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of UserRepository
 */
export class UserRepositoryDrizzle implements UserRepository {
  private mapToEntity(row: UserRow): User {
    return {
      id: String(row.id),
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      fullName: row.fullName ?? undefined,
      createdAt: row.createdAt,
    };
  }

  async findById(id: string): Promise<User | undefined> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, parseInt(id, 10)))
      .limit(1);

    return row ? this.mapToEntity(row) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    const [row] = await db.select().from(userTable).where(eq(userTable.email, email)).limit(1);
    return row ? this.mapToEntity(row) : undefined;
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.username, username))
      .limit(1);

    return row ? this.mapToEntity(row) : undefined;
  }

  async create(input: CreateUserInput): Promise<User> {
    const db = getDb();
    const [row] = await db
      .insert(userTable)
      .values({
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        fullName: input.fullName,
      })
      .returning();

    return this.mapToEntity(row);
  }

  async update(id: string, input: UpdateUserInput): Promise<void> {
    const db = getDb();
    const updateData = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      return;
    }

    await db
      .update(userTable)
      .set(updateData)
      .where(eq(userTable.id, parseInt(id, 10)));
  }
}
