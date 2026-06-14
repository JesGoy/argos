import { eq, and, gte, lte, asc, desc, inArray, sql, type SQL } from 'drizzle-orm';
import type { SaleItem, CreateSaleItemInput } from '@/core/domain/entities/SaleItem';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type {
  ProductSalesAggregate,
  ProductMarginAggregate,
} from '@/core/domain/entities/Analytics';
import { SALE_STATUS } from '@/core/domain/constants/SaleConstants';
import { getDb, type DbExecutor } from '@/infra/db/client';
import { saleItemTable, saleTable, productTable, type SaleItemRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of SaleItemRepository, scoped to one organization.
 */
export class SaleItemRepositoryDrizzle implements SaleItemRepository {
  constructor(private readonly organizationId: number) {}

  private mapToEntity(row: SaleItemRow): SaleItem {
    return {
      id: String(row.id),
      saleId: String(row.saleId),
      productId: String(row.productId),
      sku: row.sku,
      productName: row.productName,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      subtotal: row.subtotal,
      createdAt: row.createdAt,
    };
  }

  private orgScope(): SQL {
    return eq(saleItemTable.organizationId, this.organizationId);
  }

  async findBySaleId(saleId: string): Promise<SaleItem[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(saleItemTable)
      .where(and(eq(saleItemTable.saleId, parseInt(saleId, 10)), this.orgScope()));

    return rows.map((row) => this.mapToEntity(row));
  }

  async findBySaleIds(saleIds: string[]): Promise<SaleItem[]> {
    if (saleIds.length === 0) return [];

    const db = getDb();
    const numericIds = saleIds.map((id) => parseInt(id, 10));
    const rows = await db
      .select()
      .from(saleItemTable)
      .where(and(inArray(saleItemTable.saleId, numericIds), this.orgScope()));

    return rows.map((row) => this.mapToEntity(row));
  }

  async createBatch(items: CreateSaleItemInput[], executor?: unknown): Promise<SaleItem[]> {
    const db = (executor as DbExecutor) ?? getDb();

    if (items.length === 0) {
      return [];
    }

    const values = items.map((item) => ({
      organizationId: this.organizationId,
      saleId: parseInt(item.saleId, 10),
      productId: parseInt(item.productId, 10),
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }));

    const rows = await db
      .insert(saleItemTable)
      .values(values)
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async deleteBySaleId(saleId: string): Promise<void> {
    const db = getDb();
    await db
      .delete(saleItemTable)
      .where(and(eq(saleItemTable.saleId, parseInt(saleId, 10)), this.orgScope()));
  }

  async getTopProducts(opts: {
    startDate: Date;
    endDate: Date;
    limit: number;
    order: 'top' | 'bottom';
  }): Promise<ProductSalesAggregate[]> {
    const db = getDb();
    const quantityExpr = sql<number>`COALESCE(SUM(${saleItemTable.quantity}), 0)`;

    const rows = await db
      .select({
        productId: saleItemTable.productId,
        sku: sql<string>`MAX(${saleItemTable.sku})`,
        productName: sql<string>`MAX(${saleItemTable.productName})`,
        totalQuantity: quantityExpr,
        totalRevenue: sql<number>`COALESCE(SUM(${saleItemTable.subtotal}), 0)`,
      })
      .from(saleItemTable)
      .innerJoin(saleTable, eq(saleItemTable.saleId, saleTable.id))
      .where(
        and(
          this.orgScope(),
          eq(saleTable.status, SALE_STATUS.COMPLETED),
          gte(saleTable.createdAt, opts.startDate),
          lte(saleTable.createdAt, opts.endDate)
        )
      )
      .groupBy(saleItemTable.productId)
      .orderBy(
        opts.order === 'bottom'
          ? asc(sql`SUM(${saleItemTable.quantity})`)
          : desc(sql`SUM(${saleItemTable.quantity})`)
      )
      .limit(opts.limit);

    return rows.map((row) => ({
      productId: String(row.productId),
      sku: row.sku,
      productName: row.productName,
      totalQuantity: Number(row.totalQuantity) || 0,
      totalRevenue: Number(row.totalRevenue) || 0,
    }));
  }

  async getMarginByProduct(opts: {
    startDate: Date;
    endDate: Date;
    limit: number;
  }): Promise<ProductMarginAggregate[]> {
    const db = getDb();

    const rows = await db
      .select({
        productId: saleItemTable.productId,
        sku: sql<string>`MAX(${saleItemTable.sku})`,
        productName: sql<string>`MAX(${saleItemTable.productName})`,
        totalRevenue: sql<number>`COALESCE(SUM(${saleItemTable.subtotal}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${saleItemTable.quantity} * ${productTable.unitCost}), 0)`,
      })
      .from(saleItemTable)
      .innerJoin(saleTable, eq(saleItemTable.saleId, saleTable.id))
      .innerJoin(productTable, eq(saleItemTable.productId, productTable.id))
      .where(
        and(
          this.orgScope(),
          eq(saleTable.status, SALE_STATUS.COMPLETED),
          gte(saleTable.createdAt, opts.startDate),
          lte(saleTable.createdAt, opts.endDate)
        )
      )
      .groupBy(saleItemTable.productId)
      .orderBy(
        desc(
          sql`SUM(${saleItemTable.subtotal}) - SUM(${saleItemTable.quantity} * ${productTable.unitCost})`
        )
      )
      .limit(opts.limit);

    return rows.map((row) => {
      const totalRevenue = Number(row.totalRevenue) || 0;
      const totalCost = Number(row.totalCost) || 0;
      const margin = totalRevenue - totalCost;
      const marginPct = totalRevenue > 0 ? Math.round((margin / totalRevenue) * 100) : 0;
      return {
        productId: String(row.productId),
        sku: row.sku,
        productName: row.productName,
        totalRevenue,
        totalCost,
        margin,
        marginPct,
      };
    });
  }

  async getQuantitySoldByProduct(
    productIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, number>> {
    const map: Record<string, number> = {};
    productIds.forEach((id) => {
      map[id] = 0;
    });

    if (productIds.length === 0) {
      return map;
    }

    const db = getDb();
    const numericIds = productIds.map((id) => parseInt(id, 10));

    const rows = await db
      .select({
        productId: saleItemTable.productId,
        total: sql<number>`COALESCE(SUM(${saleItemTable.quantity}), 0)`,
      })
      .from(saleItemTable)
      .innerJoin(saleTable, eq(saleItemTable.saleId, saleTable.id))
      .where(
        and(
          this.orgScope(),
          eq(saleTable.status, SALE_STATUS.COMPLETED),
          inArray(saleItemTable.productId, numericIds),
          gte(saleTable.createdAt, startDate),
          lte(saleTable.createdAt, endDate)
        )
      )
      .groupBy(saleItemTable.productId);

    rows.forEach((row) => {
      map[String(row.productId)] = Number(row.total) || 0;
    });

    return map;
  }

  async getDailyQuantityByProduct(
    productId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; quantity: number }>> {
    const db = getDb();
    const dayExpr = sql`date_trunc('day', ${saleTable.createdAt})`;

    const rows = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${saleTable.createdAt}), 'YYYY-MM-DD')`,
        quantity: sql<number>`COALESCE(SUM(${saleItemTable.quantity}), 0)`,
      })
      .from(saleItemTable)
      .innerJoin(saleTable, eq(saleItemTable.saleId, saleTable.id))
      .where(
        and(
          this.orgScope(),
          eq(saleItemTable.productId, parseInt(productId, 10)),
          eq(saleTable.status, SALE_STATUS.COMPLETED),
          gte(saleTable.createdAt, startDate),
          lte(saleTable.createdAt, endDate)
        )
      )
      .groupBy(dayExpr)
      .orderBy(dayExpr);

    return rows.map((row) => ({ date: row.date, quantity: Number(row.quantity) || 0 }));
  }
}
