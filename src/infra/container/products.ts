import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';
import { StockTransactionRepositoryDrizzle } from '@/infra/repositories/StockTransactionRepositoryDrizzle';
import { RecipeRepositoryDrizzle } from '@/infra/repositories/RecipeRepositoryDrizzle';
import type { RecipeRepository } from '@/core/application/ports/RecipeRepository';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import { CreateProduct } from '@/core/application/usecases/products/CreateProduct';
import { GetProducts } from '@/core/application/usecases/products/GetProducts';
import { GetProductsWithStock } from '@/core/application/usecases/products/GetProductsWithStock';
import { GetProductById } from '@/core/application/usecases/products/GetProductById';
import { UpdateProduct } from '@/core/application/usecases/products/UpdateProduct';
import { DeleteProduct } from '@/core/application/usecases/products/DeleteProduct';
import { ProductCommandService } from '@/core/application/usecases/products/ProductCommandService';
import { makeEnforcePlanLimit, makeGetSubscription } from '@/infra/container/billing';

/**
 * All factories are scoped to an organization: pass the session's
 * organizationId so every repository query is tenant-isolated.
 */

export function makeCreateProduct(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  return new CreateProduct({ products });
}

export function makeGetProducts(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  return new GetProducts({ products });
}

export function makeGetProductsWithStock(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  const stockTransactions = new StockTransactionRepositoryDrizzle(organizationId);
  return new GetProductsWithStock({ products, stockTransactions });
}

export function makeGetProductById(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  return new GetProductById({ products });
}

export function makeUpdateProduct(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  return new UpdateProduct({ products });
}

export function makeDeleteProduct(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  return new DeleteProduct({ products });
}

export function makeRecipeRepository(organizationId: number): RecipeRepository {
  return new RecipeRepositoryDrizzle(organizationId);
}

export function makeProductRepository(organizationId: number): ProductRepository {
  return new ProductRepositoryDrizzle(organizationId);
}

export function makeProductCommandService(organizationId: number) {
  const products = new ProductRepositoryDrizzle(organizationId);
  const stockTransactions = new StockTransactionRepositoryDrizzle(organizationId);

  return new ProductCommandService({
    products,
    stockTransactions,
    organizationId,
    getSubscription: makeGetSubscription(),
    enforcePlanLimit: makeEnforcePlanLimit(),
  });
}
