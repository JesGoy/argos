/**
 * Inventory business rules shared across use cases so the definition of a
 * concept like "low stock" lives in exactly one place.
 */

/**
 * A product is low on stock when its current quantity on hand has fallen to or
 * below its configured reorder point.
 */
export function isLowStock(currentStock: number, reorderPoint: number): boolean {
  return currentStock <= reorderPoint;
}
