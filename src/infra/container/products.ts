import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';
import { StockTransactionRepositoryDrizzle } from '@/infra/repositories/StockTransactionRepositoryDrizzle';
import { CreateProduct } from '@/core/application/usecases/products/CreateProduct';
import { GetProducts } from '@/core/application/usecases/products/GetProducts';
import { GetProductById } from '@/core/application/usecases/products/GetProductById';
import { UpdateProduct } from '@/core/application/usecases/products/UpdateProduct';
import { DeleteProduct } from '@/core/application/usecases/products/DeleteProduct';
import { ProductCommandService } from '@/core/application/usecases/products/ProductCommandService';

/**
 * Factory: Create Product Use Case
 */
export function makeCreateProduct() {
  const products = new ProductRepositoryDrizzle();
  return new CreateProduct({ products });
}

/**
 * Factory: Get Products Use Case
 */
export function makeGetProducts() {
  const products = new ProductRepositoryDrizzle();
  return new GetProducts({ products });
}

/**
 * Factory: Get Product By ID Use Case
 */
export function makeGetProductById() {
  const products = new ProductRepositoryDrizzle();
  return new GetProductById({ products });
}

/**
 * Factory: Update Product Use Case
 */
export function makeUpdateProduct() {
  const products = new ProductRepositoryDrizzle();
  return new UpdateProduct({ products });
}

/**
 * Factory: Delete Product Use Case
 */
export function makeDeleteProduct() {
  const products = new ProductRepositoryDrizzle();
  return new DeleteProduct({ products });
}

/**
 * Factory: Product command service shared by manual and AI channels
 */
export function makeProductCommandService() {
  const products = new ProductRepositoryDrizzle();
  const stockTransactions = new StockTransactionRepositoryDrizzle();

  return new ProductCommandService({
    products,
    stockTransactions,
  });
}
