import { eq } from 'drizzle-orm';
import type { SaleItem, CreateSaleItemInput } from '@/core/domain/entities/SaleItem';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import { getDb } from '@/infra/db/client';
import { saleItemTable, type SaleItemRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of SaleItemRepository
 */
export class SaleItemRepositoryDrizzle implements SaleItemRepository {
  /**
   * Maps database row to domain entity
   */
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

  async findBySaleId(saleId: string): Promise<SaleItem[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(saleItemTable)
      .where(eq(saleItemTable.saleId, parseInt(saleId, 10)));

    return rows.map((row) => this.mapToEntity(row));
  }

  async createBatch(items: CreateSaleItemInput[]): Promise<SaleItem[]> {
    const db = getDb();
    
    if (items.length === 0) {
      return [];
    }

    const values = items.map((item) => ({
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
      .where(eq(saleItemTable.saleId, parseInt(saleId, 10)));
  }
}
