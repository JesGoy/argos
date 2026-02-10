import { eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Product, CreateProductInput, UpdateProductInput } from '@/core/domain/entities/Product';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import { getDb } from '@/infra/db/client';
import { productTable, type ProductRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of ProductRepository
 */
export class ProductRepositoryDrizzle implements ProductRepository {
  /**
   * Maps database row to domain entity
   */
  private mapToEntity(row: ProductRow): Product {
    return {
      id: String(row.id),
      sku: row.sku,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category,
      unit: row.unit,
      currentStock: row.currentStock,
      minStock: row.minStock,
      reorderPoint: row.reorderPoint,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: string): Promise<Product | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(productTable)
      .where(eq(productTable.id, parseInt(id, 10)))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(productTable)
      .where(eq(productTable.sku, sku))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters?: { category?: string; search?: string }): Promise<Product[]> {
    const db = getDb();
    const conditions: SQL[] = [];

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

    const rows = conditions.length > 0
      ? await db.select().from(productTable).where(sql.join(conditions, sql` AND `))
      : await db.select().from(productTable);

    return rows.map((row) => this.mapToEntity(row));
  }

  async findLowStock(): Promise<Product[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(productTable)
      .where(sql`${productTable.minStock} <= ${productTable.reorderPoint}`);

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateProductInput): Promise<Product> {
    const db = getDb();
    const [row] = await db
      .insert(productTable)
      .values({
        sku: input.sku,
        name: input.name,
        description: input.description,
        category: input.category,
        unit: input.unit,
        currentStock: input.currentStock ?? 0,
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
      .where(eq(productTable.id, parseInt(id, 10)));
  }

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(productTable)
      .where(eq(productTable.id, parseInt(id, 10)));
  }

  async exists(id: string): Promise<boolean> {
    const product = await this.findById(id);
    return product !== null;
  }
}
