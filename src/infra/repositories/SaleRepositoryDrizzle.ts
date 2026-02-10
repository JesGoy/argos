import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import type { Sale, CreateSaleInput, UpdateSaleInput } from '@/core/domain/entities/Sale';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import { SALE_STATUS } from '@/core/domain/constants/SaleConstants';
import { getDb } from '@/infra/db/client';
import { saleTable, type SaleRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of SaleRepository
 */
export class SaleRepositoryDrizzle implements SaleRepository {
  /**
   * Maps database row to domain entity
   */
  private mapToEntity(row: SaleRow): Sale {
    return {
      id: String(row.id),
      saleNumber: row.saleNumber,
      userId: row.userId,
      customerId: row.customerId ? String(row.customerId) : undefined,
      totalAmount: row.totalAmount,
      paymentMethod: row.paymentMethod,
      status: row.status,
      notes: row.notes ?? undefined,
      completedAt: row.completedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: string): Promise<Sale | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(saleTable)
      .where(eq(saleTable.id, parseInt(id, 10)))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async findBySaleNumber(saleNumber: string): Promise<Sale | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(saleTable)
      .where(eq(saleTable.saleNumber, saleNumber))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: 'pending' | 'completed' | 'cancelled';
    userId?: number;
    customerId?: string;
  }): Promise<Sale[]> {
    const db = getDb();
    const conditions = [];

    if (filters?.startDate) {
      conditions.push(gte(saleTable.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(saleTable.createdAt, filters.endDate));
    }

    if (filters?.status) {
      conditions.push(eq(saleTable.status, filters.status));
    }

    if (filters?.userId) {
      conditions.push(eq(saleTable.userId, filters.userId));
    }

    if (filters?.customerId) {
      conditions.push(eq(saleTable.customerId, parseInt(filters.customerId, 10)));
    }

    const query = db
      .select()
      .from(saleTable)
      .orderBy(desc(saleTable.createdAt));

    const rows = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    return rows.map((row) => this.mapToEntity(row));
  }

  async getTodayStats(): Promise<{
    totalAmount: number;
    totalSales: number;
    averageTicket: number;
  }> {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${saleTable.totalAmount}), 0)`,
        totalSales: sql<number>`COUNT(*)`,
      })
      .from(saleTable)
      .where(
        and(
          gte(saleTable.createdAt, today),
          eq(saleTable.status, SALE_STATUS.COMPLETED)
        )
      );

    const stats = result[0];
    const totalAmount = Number(stats.totalAmount) || 0;
    const totalSales = Number(stats.totalSales) || 0;
    const averageTicket = totalSales > 0 ? totalAmount / totalSales : 0;

    return {
      totalAmount,
      totalSales,
      averageTicket,
    };
  }

  async getDateRangeStats(startDate: Date, endDate: Date): Promise<{
    totalAmount: number;
    totalSales: number;
    averageTicket: number;
    byPaymentMethod: Record<string, number>;
  }> {
    const db = getDb();

    // Total stats
    const totalResult = await db
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${saleTable.totalAmount}), 0)`,
        totalSales: sql<number>`COUNT(*)`,
      })
      .from(saleTable)
      .where(
        and(
          gte(saleTable.createdAt, startDate),
          lte(saleTable.createdAt, endDate),
          eq(saleTable.status, SALE_STATUS.COMPLETED)
        )
      );

    // By payment method
    const paymentMethodResult = await db
      .select({
        paymentMethod: saleTable.paymentMethod,
        totalAmount: sql<number>`COALESCE(SUM(${saleTable.totalAmount}), 0)`,
      })
      .from(saleTable)
      .where(
        and(
          gte(saleTable.createdAt, startDate),
          lte(saleTable.createdAt, endDate),
          eq(saleTable.status, SALE_STATUS.COMPLETED)
        )
      )
      .groupBy(saleTable.paymentMethod);

    const stats = totalResult[0];
    const totalAmount = Number(stats.totalAmount) || 0;
    const totalSales = Number(stats.totalSales) || 0;
    const averageTicket = totalSales > 0 ? totalAmount / totalSales : 0;

    const byPaymentMethod: Record<string, number> = {};
    paymentMethodResult.forEach((row) => {
      byPaymentMethod[row.paymentMethod] = Number(row.totalAmount) || 0;
    });

    return {
      totalAmount,
      totalSales,
      averageTicket,
      byPaymentMethod,
    };
  }

  async create(input: CreateSaleInput): Promise<Sale> {
    const db = getDb();
    const saleNumber = await this.generateSaleNumber();

    const [row] = await db
      .insert(saleTable)
      .values({
        saleNumber,
        userId: input.userId,
        customerId: input.customerId ? parseInt(input.customerId, 10) : null,
        totalAmount: input.totalAmount,
        paymentMethod: input.paymentMethod,
        status: input.status,
        notes: input.notes,
        completedAt: input.completedAt,
        updatedAt: new Date(),
      })
      .returning();

    return this.mapToEntity(row);
  }

  async update(id: string, input: UpdateSaleInput): Promise<void> {
    const db = getDb();
    await db
      .update(saleTable)
      .set({
        ...input,
        customerId: input.customerId ? parseInt(input.customerId, 10) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(saleTable.id, parseInt(id, 10)));
  }

  async cancel(id: string): Promise<void> {
    const db = getDb();
    await db
      .update(saleTable)
      .set({
        status: SALE_STATUS.CANCELLED,
        updatedAt: new Date(),
      })
      .where(eq(saleTable.id, parseInt(id, 10)));
  }

  async generateSaleNumber(): Promise<string> {
    const db = getDb();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `V${year}${month}${day}`;

    // Get the last sale number for today
    const lastSale = await db
      .select()
      .from(saleTable)
      .where(sql`${saleTable.saleNumber} LIKE ${prefix}%`)
      .orderBy(desc(saleTable.saleNumber))
      .limit(1);

    if (lastSale.length === 0) {
      return `${prefix}-0001`;
    }

    // Extract the sequence number and increment
    const lastNumber = lastSale[0].saleNumber;
    const lastSequence = parseInt(lastNumber.split('-')[1], 10);
    const nextSequence = String(lastSequence + 1).padStart(4, '0');

    return `${prefix}-${nextSequence}`;
  }
}
