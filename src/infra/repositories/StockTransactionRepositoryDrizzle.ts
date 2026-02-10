import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import type { StockTransaction, CreateStockTransactionInput } from '@/core/domain/entities/StockTransaction';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import { getDb } from '@/infra/db/client';
import { stockTransactionTable, type StockTransactionRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of StockTransactionRepository
 */
export class StockTransactionRepositoryDrizzle implements StockTransactionRepository {
  /**
   * Maps database row to domain entity
   */
  private mapToEntity(row: StockTransactionRow): StockTransaction {
    return {
      id: String(row.id),
      productId: String(row.productId),
      type: row.type,
      quantity: row.quantity,
      reason: row.reason,
      userId: row.userId,
      saleId: row.saleId ? String(row.saleId) : undefined,
      referenceNumber: row.referenceNumber ?? undefined,
      createdAt: row.createdAt,
    };
  }

  async findByProductId(productId: string): Promise<StockTransaction[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(stockTransactionTable)
      .where(eq(stockTransactionTable.productId, parseInt(productId, 10)))
      .orderBy(desc(stockTransactionTable.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async findBySaleId(saleId: string): Promise<StockTransaction[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(stockTransactionTable)
      .where(eq(stockTransactionTable.saleId, parseInt(saleId, 10)));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getCurrentStock(productId: string): Promise<number> {
    const db = getDb();
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${stockTransactionTable.quantity}), 0)`,
      })
      .from(stockTransactionTable)
      .where(eq(stockTransactionTable.productId, parseInt(productId, 10)));

    return Number(result[0]?.total) || 0;
  }

  async getCurrentStockBatch(productIds: string[]): Promise<Record<string, number>> {
    const db = getDb();
    const numericIds = productIds.map((id) => parseInt(id, 10));

    const results = await db
      .select({
        productId: stockTransactionTable.productId,
        total: sql<number>`COALESCE(SUM(${stockTransactionTable.quantity}), 0)`,
      })
      .from(stockTransactionTable)
      .where(sql`${stockTransactionTable.productId} IN ${numericIds}`)
      .groupBy(stockTransactionTable.productId);

    const stockMap: Record<string, number> = {};
    results.forEach((row) => {
      stockMap[String(row.productId)] = Number(row.total) || 0;
    });

    // Fill in zeros for products with no transactions
    productIds.forEach((id) => {
      if (!(id in stockMap)) {
        stockMap[id] = 0;
      }
    });

    return stockMap;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<StockTransaction[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(stockTransactionTable)
      .where(
        and(
          gte(stockTransactionTable.createdAt, startDate),
          lte(stockTransactionTable.createdAt, endDate)
        )
      )
      .orderBy(desc(stockTransactionTable.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateStockTransactionInput): Promise<StockTransaction> {
    const db = getDb();
    const [row] = await db
      .insert(stockTransactionTable)
      .values({
        productId: parseInt(input.productId, 10),
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        userId: input.userId,
        saleId: input.saleId ? parseInt(input.saleId, 10) : null,
        referenceNumber: input.referenceNumber,
      })
      .returning();

    return this.mapToEntity(row);
  }

  async createBatch(inputs: CreateStockTransactionInput[]): Promise<StockTransaction[]> {
    const db = getDb();
    
    if (inputs.length === 0) {
      return [];
    }

    const values = inputs.map((input) => ({
      productId: parseInt(input.productId, 10),
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      userId: input.userId,
      saleId: input.saleId ? parseInt(input.saleId, 10) : null,
      referenceNumber: input.referenceNumber,
    }));

    const rows = await db
      .insert(stockTransactionTable)
      .values(values)
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }
}
