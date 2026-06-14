/**
 * RecipeComponent Domain Entity
 * One ingredient line of a composite (finished-good) product's recipe/BOM.
 */
export interface RecipeComponent {
  id: string;
  finishedProductId: string;
  ingredientProductId: string;
  /** Units of the ingredient consumed per 1 unit of the finished good. */
  quantityPerUnit: number;
  createdAt: Date;
}

/**
 * RecipeComponent enriched with the ingredient's display fields (for editor/list views).
 */
export interface RecipeComponentDetail extends RecipeComponent {
  ingredientSku: string;
  ingredientName: string;
}

export interface CreateRecipeComponentInput {
  finishedProductId: string;
  ingredientProductId: string;
  quantityPerUnit: number;
}
