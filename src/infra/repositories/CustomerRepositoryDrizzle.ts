import { eq, or, ilike } from 'drizzle-orm';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '@/core/domain/entities/Customer';
import type { CustomerRepository } from '@/core/application/ports/CustomerRepository';
import { getDb } from '@/infra/db/client';
import { customerTable, type CustomerRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of CustomerRepository
 */
export class CustomerRepositoryDrizzle implements CustomerRepository {
  /**
   * Maps database row to domain entity
   */
  private mapToEntity(row: CustomerRow): Customer {
    return {
      id: String(row.id),
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      creditLimit: row.creditLimit,
      currentDebt: row.currentDebt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: string): Promise<Customer | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(customerTable)
      .where(eq(customerTable.id, parseInt(id, 10)))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async search(searchTerm: string): Promise<Customer[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(customerTable)
      .where(
        or(
          ilike(customerTable.name, `%${searchTerm}%`),
          ilike(customerTable.phone, `%${searchTerm}%`),
          ilike(customerTable.email, `%${searchTerm}%`)
        )
      );

    return rows.map((row) => this.mapToEntity(row));
  }

  async findAll(): Promise<Customer[]> {
    const db = getDb();
    const rows = await db.select().from(customerTable);

    return rows.map((row) => this.mapToEntity(row));
  }

  async findWithDebt(): Promise<Customer[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(customerTable)
      .where(eq(customerTable.currentDebt, 0));

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const db = getDb();
    const [row] = await db
      .insert(customerTable)
      .values({
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        creditLimit: input.creditLimit,
        currentDebt: 0,
        updatedAt: new Date(),
      })
      .returning();

    return this.mapToEntity(row);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<void> {
    const db = getDb();
    await db
      .update(customerTable)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(customerTable.id, parseInt(id, 10)));
  }

  async updateDebt(id: string, amount: number): Promise<void> {
    const db = getDb();
    await db
      .update(customerTable)
      .set({
        currentDebt: amount,
        updatedAt: new Date(),
      })
      .where(eq(customerTable.id, parseInt(id, 10)));
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(customerTable)
      .where(eq(customerTable.id, parseInt(id, 10)));
  }
}
