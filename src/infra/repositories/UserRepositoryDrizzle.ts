import { eq, asc } from 'drizzle-orm';
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
} from '@/core/domain/entities/User';
import type { UserStatus } from '@/core/domain/constants/UserConstants';
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
      organizationId: row.organizationId,
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      status: row.status as UserStatus,
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

  async findByOrganization(organizationId: number): Promise<User[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.organizationId, organizationId))
      .orderBy(asc(userTable.username));
    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateUserInput): Promise<User> {
    const db = getDb();
    const [row] = await db
      .insert(userTable)
      .values({
        organizationId: input.organizationId,
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
