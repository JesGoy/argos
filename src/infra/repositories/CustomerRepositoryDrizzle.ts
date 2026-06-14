import { eq, and, or, ilike, sql, type SQL } from 'drizzle-orm';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '@/core/domain/entities/Customer';
import type { CustomerRepository } from '@/core/application/ports/CustomerRepository';
import { getDb, type DbExecutor } from '@/infra/db/client';
import { customerTable, type CustomerRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of CustomerRepository, scoped to one organization.
 */
export class CustomerRepositoryDrizzle implements CustomerRepository {
  constructor(private readonly organizationId: number) {}

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

  private orgScope(): SQL {
    return eq(customerTable.organizationId, this.organizationId);
  }

  async findById(id: string): Promise<Customer | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(customerTable)
      .where(and(eq(customerTable.id, parseInt(id, 10)), this.orgScope()))
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
        and(
          this.orgScope(),
          or(
            ilike(customerTable.name, `%${searchTerm}%`),
            ilike(customerTable.phone, `%${searchTerm}%`),
            ilike(customerTable.email, `%${searchTerm}%`)
          )
        )
      );

    return rows.map((row) => this.mapToEntity(row));
  }

  async findAll(): Promise<Customer[]> {
    const db = getDb();
    const rows = await db.select().from(customerTable).where(this.orgScope());

    return rows.map((row) => this.mapToEntity(row));
  }

  async findWithDebt(): Promise<Customer[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(customerTable)
      .where(and(this.orgScope(), sql`${customerTable.currentDebt} > 0`));

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const db = getDb();
    const [row] = await db
      .insert(customerTable)
      .values({
        organizationId: this.organizationId,
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
      .where(and(eq(customerTable.id, parseInt(id, 10)), this.orgScope()));
  }

  async updateDebt(id: string, amount: number, executor?: unknown): Promise<void> {
    const db = (executor as DbExecutor) ?? getDb();
    // Increment existing debt rather than overwriting it.
    await db
      .update(customerTable)
      .set({
        currentDebt: sql`${customerTable.currentDebt} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(customerTable.id, parseInt(id, 10)), this.orgScope()));
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(customerTable)
      .where(and(eq(customerTable.id, parseInt(id, 10)), this.orgScope()));
  }
}
