import { eq, and, type SQL } from 'drizzle-orm';
import type {
  RecipeComponent,
  RecipeComponentDetail,
  CreateRecipeComponentInput,
} from '@/core/domain/entities/RecipeComponent';
import type { RecipeRepository } from '@/core/application/ports/RecipeRepository';
import { getDb } from '@/infra/db/client';
import { recipeComponentTable, productTable, type RecipeComponentRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of RecipeRepository, scoped to one organization.
 */
export class RecipeRepositoryDrizzle implements RecipeRepository {
  constructor(private readonly organizationId: number) {}

  private mapToEntity(row: RecipeComponentRow): RecipeComponent {
    return {
      id: String(row.id),
      finishedProductId: String(row.finishedProductId),
      ingredientProductId: String(row.ingredientProductId),
      quantityPerUnit: row.quantityPerUnit,
      createdAt: row.createdAt,
    };
  }

  private orgScope(): SQL {
    return eq(recipeComponentTable.organizationId, this.organizationId);
  }

  async findByFinishedProduct(finishedProductId: string): Promise<RecipeComponent[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(recipeComponentTable)
      .where(
        and(
          eq(recipeComponentTable.finishedProductId, parseInt(finishedProductId, 10)),
          this.orgScope()
        )
      );

    return rows.map((row) => this.mapToEntity(row));
  }

  async listDetailed(finishedProductId: string): Promise<RecipeComponentDetail[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: recipeComponentTable.id,
        finishedProductId: recipeComponentTable.finishedProductId,
        ingredientProductId: recipeComponentTable.ingredientProductId,
        quantityPerUnit: recipeComponentTable.quantityPerUnit,
        createdAt: recipeComponentTable.createdAt,
        ingredientSku: productTable.sku,
        ingredientName: productTable.name,
      })
      .from(recipeComponentTable)
      .innerJoin(productTable, eq(productTable.id, recipeComponentTable.ingredientProductId))
      .where(
        and(
          eq(recipeComponentTable.finishedProductId, parseInt(finishedProductId, 10)),
          this.orgScope()
        )
      );

    return rows.map((row) => ({
      id: String(row.id),
      finishedProductId: String(row.finishedProductId),
      ingredientProductId: String(row.ingredientProductId),
      quantityPerUnit: row.quantityPerUnit,
      createdAt: row.createdAt,
      ingredientSku: row.ingredientSku,
      ingredientName: row.ingredientName,
    }));
  }

  async addComponent(input: CreateRecipeComponentInput): Promise<RecipeComponent> {
    const db = getDb();
    const [row] = await db
      .insert(recipeComponentTable)
      .values({
        organizationId: this.organizationId,
        finishedProductId: parseInt(input.finishedProductId, 10),
        ingredientProductId: parseInt(input.ingredientProductId, 10),
        quantityPerUnit: input.quantityPerUnit,
      })
      .returning();

    return this.mapToEntity(row);
  }

  async removeComponent(id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(recipeComponentTable)
      .where(and(eq(recipeComponentTable.id, parseInt(id, 10)), this.orgScope()));
  }
}
