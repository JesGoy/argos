import { eq, and, gte, lte, sql, desc, inArray, type SQL } from 'drizzle-orm';
import type { StockTransaction, CreateStockTransactionInput } from '@/core/domain/entities/StockTransaction';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type {
  WasteProductAggregate,
  WasteCategoryAggregate,
} from '@/core/domain/entities/Analytics';
import { TRANSACTION_TYPE } from '@/core/domain/constants/StockConstants';
import { getDb, type DbExecutor } from '@/infra/db/client';
import { stockTransactionTable, productTable, type StockTransactionRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of StockTransactionRepository, scoped to one organization.
 */
export class StockTransactionRepositoryDrizzle implements StockTransactionRepository {
  constructor(private readonly organizationId: number) {}

  private mapToEntity(row: StockTransactionRow): StockTransaction {
    return {
      id: String(row.id),
      productId: String(row.productId),
      type: row.type,
      quantity: row.quantity,
      reason: row.reason,
      wasteReason: row.wasteReason ?? undefined,
      userId: row.userId,
      saleId: row.saleId ? String(row.saleId) : undefined,
      supplierId: row.supplierId ? String(row.supplierId) : undefined,
      perUnitCost: row.perUnitCost ?? undefined,
      referenceNumber: row.referenceNumber ?? undefined,
      createdAt: row.createdAt,
    };
  }

  private orgScope(): SQL {
    return eq(stockTransactionTable.organizationId, this.organizationId);
  }

  async findByProductId(productId: string): Promise<StockTransaction[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(stockTransactionTable)
      .where(and(eq(stockTransactionTable.productId, parseInt(productId, 10)), this.orgScope()))
      .orderBy(desc(stockTransactionTable.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async findBySaleId(saleId: string): Promise<StockTransaction[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(stockTransactionTable)
      .where(and(eq(stockTransactionTable.saleId, parseInt(saleId, 10)), this.orgScope()));

    return rows.map((row) => this.mapToEntity(row));
  }

  async getCurrentStock(productId: string): Promise<number> {
    const db = getDb();
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${stockTransactionTable.quantity}), 0)`,
      })
      .from(stockTransactionTable)
      .where(and(eq(stockTransactionTable.productId, parseInt(productId, 10)), this.orgScope()));

    return Number(result[0]?.total) || 0;
  }

  async getCurrentStockBatch(productIds: string[]): Promise<Record<string, number>> {
    const db = getDb();
    const numericIds = productIds.map((id) => parseInt(id, 10));

    const stockMap: Record<string, number> = {};
    productIds.forEach((id) => {
      stockMap[id] = 0;
    });

    if (numericIds.length === 0) {
      return stockMap;
    }

    const results = await db
      .select({
        productId: stockTransactionTable.productId,
        total: sql<number>`COALESCE(SUM(${stockTransactionTable.quantity}), 0)`,
      })
      .from(stockTransactionTable)
      .where(and(inArray(stockTransactionTable.productId, numericIds), this.orgScope()))
      .groupBy(stockTransactionTable.productId);

    results.forEach((row) => {
      stockMap[String(row.productId)] = Number(row.total) || 0;
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
          this.orgScope(),
          gte(stockTransactionTable.createdAt, startDate),
          lte(stockTransactionTable.createdAt, endDate)
        )
      )
      .orderBy(desc(stockTransactionTable.createdAt));

    return rows.map((row) => this.mapToEntity(row));
  }

  async create(input: CreateStockTransactionInput, executor?: unknown): Promise<StockTransaction> {
    const db = (executor as DbExecutor) ?? getDb();
    const [row] = await db
      .insert(stockTransactionTable)
      .values({
        organizationId: this.organizationId,
        productId: parseInt(input.productId, 10),
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        wasteReason: input.wasteReason,
        userId: input.userId,
        saleId: input.saleId ? parseInt(input.saleId, 10) : null,
        supplierId: input.supplierId ? parseInt(input.supplierId, 10) : null,
        perUnitCost: input.perUnitCost,
        referenceNumber: input.referenceNumber,
      })
      .returning();

    return this.mapToEntity(row);
  }

  async createBatch(inputs: CreateStockTransactionInput[], executor?: unknown): Promise<StockTransaction[]> {
    const db = (executor as DbExecutor) ?? getDb();

    if (inputs.length === 0) {
      return [];
    }

    const values = inputs.map((input) => ({
      organizationId: this.organizationId,
      productId: parseInt(input.productId, 10),
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      wasteReason: input.wasteReason,
      userId: input.userId,
      saleId: input.saleId ? parseInt(input.saleId, 10) : null,
      supplierId: input.supplierId ? parseInt(input.supplierId, 10) : null,
      perUnitCost: input.perUnitCost,
      referenceNumber: input.referenceNumber,
    }));

    const rows = await db
      .insert(stockTransactionTable)
      .values(values)
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async getWasteByProduct(startDate: Date, endDate: Date): Promise<WasteProductAggregate[]> {
    const db = getDb();

    // Waste quantities are stored negative; negate the sums to report positive
    // units and cost.
    const rows = await db
      .select({
        productId: stockTransactionTable.productId,
        sku: sql<string>`MAX(${productTable.sku})`,
        productName: sql<string>`MAX(${productTable.name})`,
        units: sql<number>`COALESCE(-SUM(${stockTransactionTable.quantity}), 0)`,
        costCents: sql<number>`COALESCE(-SUM(${stockTransactionTable.quantity} * ${productTable.unitCost}), 0)`,
      })
      .from(stockTransactionTable)
      .innerJoin(productTable, eq(stockTransactionTable.productId, productTable.id))
      .where(
        and(
          this.orgScope(),
          eq(stockTransactionTable.type, TRANSACTION_TYPE.WASTE),
          gte(stockTransactionTable.createdAt, startDate),
          lte(stockTransactionTable.createdAt, endDate)
        )
      )
      .groupBy(stockTransactionTable.productId)
      .orderBy(desc(sql`-SUM(${stockTransactionTable.quantity} * ${productTable.unitCost})`));

    return rows.map((row) => ({
      productId: String(row.productId),
      sku: row.sku,
      productName: row.productName,
      units: Number(row.units) || 0,
      costCents: Number(row.costCents) || 0,
    }));
  }

  async getWasteByCategory(startDate: Date, endDate: Date): Promise<WasteCategoryAggregate[]> {
    const db = getDb();

    const rows = await db
      .select({
        category: stockTransactionTable.wasteReason,
        units: sql<number>`COALESCE(-SUM(${stockTransactionTable.quantity}), 0)`,
        costCents: sql<number>`COALESCE(-SUM(${stockTransactionTable.quantity} * ${productTable.unitCost}), 0)`,
      })
      .from(stockTransactionTable)
      .innerJoin(productTable, eq(stockTransactionTable.productId, productTable.id))
      .where(
        and(
          this.orgScope(),
          eq(stockTransactionTable.type, TRANSACTION_TYPE.WASTE),
          gte(stockTransactionTable.createdAt, startDate),
          lte(stockTransactionTable.createdAt, endDate)
        )
      )
      .groupBy(stockTransactionTable.wasteReason)
      .orderBy(desc(sql`-SUM(${stockTransactionTable.quantity} * ${productTable.unitCost})`));

    return rows.map((row) => ({
      category: row.category ?? 'other',
      units: Number(row.units) || 0,
      costCents: Number(row.costCents) || 0,
    }));
  }
}
