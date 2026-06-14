import type {
  RecipeComponent,
  RecipeComponentDetail,
  CreateRecipeComponentInput,
} from '@/core/domain/entities/RecipeComponent';

/**
 * Recipe Repository Port (org-scoped)
 */
export interface RecipeRepository {
  /** Raw components for a finished product (used by ProcessSale to expand a sale). */
  findByFinishedProduct(finishedProductId: string): Promise<RecipeComponent[]>;
  /** Components enriched with ingredient name/sku (for the editor). */
  listDetailed(finishedProductId: string): Promise<RecipeComponentDetail[]>;
  addComponent(input: CreateRecipeComponentInput): Promise<RecipeComponent>;
  removeComponent(id: string): Promise<void>;
}
