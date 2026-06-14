import { eq, and, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Product, CreateProductInput, UpdateProductInput } from '@/core/domain/entities/Product';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import { getDb } from '@/infra/db/client';
import { productTable, stockTransactionTable, type ProductRow } from '@/infra/db/schema';
import { ProductDeletionError } from '@/core/domain/errors/ProductErrors';

/**
 * Drizzle implementation of ProductRepository, scoped to a single organization.
 * Every query is filtered by organizationId so tenants never see each other's data.
 */
export class ProductRepositoryDrizzle implements ProductRepository {
  constructor(private readonly organizationId: number) {}

  private mapToEntity(row: ProductRow): Product {
    return {
      id: String(row.id),
      sku: row.sku,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category,
      unit: row.unit,
      unitCost: row.unitCost,
      sellingPrice: row.sellingPrice,
      isComposite: row.isComposite,
      minStock: row.minStock,
      reorderPoint: row.reorderPoint,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private orgScope(): SQL {
    return eq(productTable.organizationId, this.organizationId);
  }

  async findById(id: string): Promise<Product | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(productTable)
      .where(and(eq(productTable.id, parseInt(id, 10)), this.orgScope()))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(productTable)
      .where(and(eq(productTable.sku, sku), this.orgScope()))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  private buildFilters(filters?: { category?: string; search?: string }): SQL[] {
    const conditions: SQL[] = [this.orgScope()];

    if (filters?.category) {
      conditions.push(eq(productTable.category, filters.category));
    }

    if (filters?.search) {
      conditions.push(
        or(
          ilike(productTable.name, `%${filters.search}%`),
          ilike(productTable.sku, `%${filters.search}%`),
          ilike(productTable.description, `%${filters.search}%`)
        )!
      );
    }

    return conditions;
  }

  async findAll(filters?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    const db = getDb();
    const conditions = this.buildFilters(filters);

    const baseQuery = db
      .select()
      .from(productTable)
      .where(and(...conditions))
      .orderBy(productTable.name)
      .$dynamic();

    if (filters?.limit !== undefined) {
      baseQuery.limit(filters.limit);
    }
    if (filters?.offset !== undefined) {
      baseQuery.offset(filters.offset);
    }

    const rows = await baseQuery;
    return rows.map((row) => this.mapToEntity(row));
  }

  async count(filters?: { category?: string; search?: string }): Promise<number> {
    const db = getDb();
    const conditions = this.buildFilters(filters);
    const result = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(productTable)
      .where(and(...conditions));
    return Number(result[0]?.total) || 0;
  }

  async countLowStock(): Promise<number> {
    const db = getDb();
    const currentStock = sql`COALESCE((SELECT SUM(${stockTransactionTable.quantity}) FROM ${stockTransactionTable} WHERE ${stockTransactionTable.productId} = ${productTable.id}), 0)`;
    const result = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(productTable)
      .where(and(this.orgScope(), sql`${currentStock} <= ${productTable.reorderPoint}`));
    return Number(result[0]?.total) || 0;
  }

  async countCategories(): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ total: sql<number>`COUNT(DISTINCT ${productTable.category})` })
      .from(productTable)
      .where(this.orgScope());
    return Number(result[0]?.total) || 0;
  }

  async findLowStock(): Promise<Product[]> {
    const db = getDb();
    // Stock is derived from the sum of StockTransaction rows, so "low stock"
    // compares the live computed quantity against the reorder point — not two
    // static configuration columns.
    const currentStock = sql`COALESCE((SELECT SUM(${stockTransactionTable.quantity}) FROM ${stockTransactionTable} WHERE ${stockTransactionTable.productId} = ${productTable.id}), 0)`;
    const rows = await db
      .select()
      .from(productTable)
      .where(and(this.orgScope(), sql`${currentStock} <= ${productTable.reorderPoint}`));

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateProductInput): Promise<Product> {
    const db = getDb();
    const [row] = await db
      .insert(productTable)
      .values({
        organizationId: this.organizationId,
        sku: input.sku,
        name: input.name,
        description: input.description,
        category: input.category,
        unit: input.unit,
        unitCost: input.unitCost,
        sellingPrice: input.sellingPrice,
        isComposite: input.isComposite,
        minStock: input.minStock,
        reorderPoint: input.reorderPoint,
        updatedAt: new Date(),
      })
      .returning();

    return this.mapToEntity(row);
  }

  async update(id: string, input: UpdateProductInput): Promise<void> {
    const db = getDb();
    await db
      .update(productTable)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(productTable.id, parseInt(id, 10)), this.orgScope()));
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    try {
      await db
        .delete(productTable)
        .where(and(eq(productTable.id, parseInt(id, 10)), this.orgScope()));
    } catch (err) {
      // Postgres foreign_key_violation. Prefer the SQLSTATE code over fragile
      // message-string matching.
      const code = (err as { code?: string }).code;
      const msg = err instanceof Error ? err.message : '';
      if (code === '23503' || msg.includes('foreign key') || msg.includes('violates') || msg.includes('restrict')) {
        throw new ProductDeletionError(
          'tiene transacciones o ventas asociadas. Elimina primero los movimientos de stock y ventas relacionados, o contacta al administrador.'
        );
      }
      throw err;
    }
  }

  async exists(id: string): Promise<boolean> {
    const product = await this.findById(id);
    return product !== null;
  }
}
