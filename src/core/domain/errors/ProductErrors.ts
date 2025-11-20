/**
 * Domain Error: Product not found
 */
export class ProductNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Producto no encontrado: ${identifier}`);
    this.name = 'ProductNotFoundError';
  }
}

/**
 * Domain Error: Duplicate SKU
 */
export class DuplicateSKUError extends Error {
  constructor(sku: string) {
    super(`Ya existe un producto con el SKU: ${sku}`);
    this.name = 'DuplicateSKUError';
  }
}

/**
 * Domain Error: Invalid product data
 */
export class InvalidProductDataError extends Error {
  constructor(message: string) {
    super(`Datos de producto inválidos: ${message}`);
    this.name = 'InvalidProductDataError';
  }
}

/**
 * Domain Error: Product deletion failed
 */
export class ProductDeletionError extends Error {
  constructor(reason: string) {
    super(`No se puede eliminar el producto: ${reason}`);
    this.name = 'ProductDeletionError';
  }
}
