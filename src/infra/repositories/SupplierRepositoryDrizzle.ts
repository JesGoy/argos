import { eq, and, asc, type SQL } from 'drizzle-orm';
import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from '@/core/domain/entities/Supplier';
import type { SupplierRepository } from '@/core/application/ports/SupplierRepository';
import { getDb } from '@/infra/db/client';
import { supplierTable, type SupplierRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of SupplierRepository, scoped to a single organization.
 */
export class SupplierRepositoryDrizzle implements SupplierRepository {
  constructor(private readonly organizationId: number) {}

  private mapToEntity(row: SupplierRow): Supplier {
    return {
      id: String(row.id),
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      leadTimeDays: row.leadTimeDays,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private orgScope(): SQL {
    return eq(supplierTable.organizationId, this.organizationId);
  }

  async findAll(): Promise<Supplier[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(supplierTable)
      .where(this.orgScope())
      .orderBy(asc(supplierTable.name));

    return rows.map((row) => this.mapToEntity(row));
  }

  async findById(id: string): Promise<Supplier | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(supplierTable)
      .where(and(eq(supplierTable.id, parseInt(id, 10)), this.orgScope()))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const db = getDb();
    const [row] = await db
      .insert(supplierTable)
      .values({
        organizationId: this.organizationId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        leadTimeDays: input.leadTimeDays ?? 7,
        updatedAt: new Date(),
      })
      .returning();

    return this.mapToEntity(row);
  }

  async update(id: string, input: UpdateSupplierInput): Promise<void> {
    const db = getDb();
    await db
      .update(supplierTable)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(supplierTable.id, parseInt(id, 10)), this.orgScope()));
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(supplierTable)
      .where(and(eq(supplierTable.id, parseInt(id, 10)), this.orgScope()));
  }
}
