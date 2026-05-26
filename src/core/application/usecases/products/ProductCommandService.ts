import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import { CreateProduct } from '@/core/application/usecases/products/CreateProduct';
import { DeleteProduct } from '@/core/application/usecases/products/DeleteProduct';
import { GetProducts } from '@/core/application/usecases/products/GetProducts';
import { UpdateProduct } from '@/core/application/usecases/products/UpdateProduct';
import type { Product, CreateProductInput, UpdateProductInput } from '@/core/domain/entities/Product';
import {
  PRODUCT_AI_ACTION,
  PRODUCT_COMMAND_ACTION,
  PRODUCT_COMMAND_SOURCE,
  type ProductAIAction,
  type ProductCommandAction,
  type ProductCommandSource,
} from '@/core/domain/constants/ProductConstants';
import { PRODUCT_MANAGEMENT_ROLES, type UserRole } from '@/core/domain/constants/UserConstants';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';
import { PRODUCT_REVALIDATE_PATHS } from '@/config/routes';

export interface ProductCommandActor {
  userId: string;
  role: UserRole;
  source: ProductCommandSource;
}

export interface ProductCommandResult<T = unknown> {
  action: ProductCommandAction;
  source: ProductCommandSource;
  data: T;
  refreshPaths: readonly string[];
}

export interface ProductDeleteConfirmation {
  action: ProductAIAction;
  sku: string;
  productName: string;
}

export class ProductCommandService {
  private readonly createProductUseCase: CreateProduct;
  private readonly updateProductUseCase: UpdateProduct;
  private readonly deleteProductUseCase: DeleteProduct;
  private readonly getProductsUseCase: GetProducts;

  constructor(
    private readonly deps: {
      products: ProductRepository;
      stockTransactions: StockTransactionRepository;
    }
  ) {
    this.createProductUseCase = new CreateProduct({ products: deps.products });
    this.updateProductUseCase = new UpdateProduct({ products: deps.products });
    this.deleteProductUseCase = new DeleteProduct({ products: deps.products });
    this.getProductsUseCase = new GetProducts({ products: deps.products });
  }

  async create(
    actor: ProductCommandActor,
    input: CreateProductInput
  ): Promise<ProductCommandResult<Product>> {
    this.assertCanManage(actor.role);

    const product = await this.createProductUseCase.execute(input);

    return {
      action: PRODUCT_COMMAND_ACTION.CREATE,
      source: actor.source,
      data: product,
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    };
  }

  async updateById(
    actor: ProductCommandActor,
    id: string,
    input: UpdateProductInput
  ): Promise<ProductCommandResult<Product>> {
    this.assertCanManage(actor.role);

    await this.updateProductUseCase.execute(id, input);
    const product = await this.getProductById(id);

    return {
      action: PRODUCT_COMMAND_ACTION.UPDATE,
      source: actor.source,
      data: product,
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    };
  }

  async updateBySku(
    actor: ProductCommandActor,
    sku: string,
    input: UpdateProductInput
  ): Promise<ProductCommandResult<Product>> {
    this.assertCanManage(actor.role);

    const product = await this.getProductBySkuOrThrow(sku);
    return this.updateById(actor, product.id, input);
  }

  async deleteById(
    actor: ProductCommandActor,
    id: string
  ): Promise<ProductCommandResult<{ id: string }>> {
    this.assertCanManage(actor.role);

    await this.deleteProductUseCase.execute(id);

    return {
      action: PRODUCT_COMMAND_ACTION.DELETE,
      source: actor.source,
      data: { id },
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    };
  }

  async buildDeleteConfirmation(
    actor: ProductCommandActor,
    sku: string
  ): Promise<ProductDeleteConfirmation> {
    this.assertCanManage(actor.role);

    const product = await this.getProductBySkuOrThrow(sku);

    return {
      action: PRODUCT_AI_ACTION.DELETE,
      sku: product.sku,
      productName: product.name,
    };
  }

  async deleteBySku(
    actor: ProductCommandActor,
    sku: string
  ): Promise<ProductCommandResult<{ sku: string; name: string }>> {
    this.assertCanManage(actor.role);

    const product = await this.getProductBySkuOrThrow(sku);
    await this.deleteProductUseCase.execute(product.id);

    return {
      action: PRODUCT_COMMAND_ACTION.DELETE,
      source: actor.source,
      data: {
        sku: product.sku,
        name: product.name,
      },
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    };
  }

  async getBySku(sku: string): Promise<ProductCommandResult<Product>> {
    const product = await this.getProductBySkuOrThrow(sku);

    return {
      action: PRODUCT_COMMAND_ACTION.GET,
      source: PRODUCT_COMMAND_SOURCE.AI,
      data: product,
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    };
  }

  async list(filters?: { category?: string; search?: string }) {
    const products = await this.getProductsUseCase.execute(filters);

    return {
      action: PRODUCT_COMMAND_ACTION.LIST,
      source: PRODUCT_COMMAND_SOURCE.AI,
      data: products,
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    } satisfies ProductCommandResult<Product[]>;
  }

  async searchByName(query: string) {
    const products = await this.getProductsUseCase.execute({ search: query });

    return {
      action: PRODUCT_COMMAND_ACTION.SEARCH,
      source: PRODUCT_COMMAND_SOURCE.AI,
      data: products,
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    } satisfies ProductCommandResult<Product[]>;
  }

  async getCurrentStockBySku(sku: string) {
    const product = await this.getProductBySkuOrThrow(sku);
    const currentStock = await this.deps.stockTransactions.getCurrentStock(product.id);

    return {
      action: PRODUCT_COMMAND_ACTION.CHECK_STOCK,
      source: PRODUCT_COMMAND_SOURCE.AI,
      data: {
        product,
        currentStock,
        isLowStock: currentStock <= product.reorderPoint,
      },
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    } satisfies ProductCommandResult<{
      product: Product;
      currentStock: number;
      isLowStock: boolean;
    }>;
  }

  async getLowStockProducts() {
    const products = await this.deps.products.findLowStock();
    const productsWithStock = await Promise.all(
      products.map(async (product) => {
        const currentStock = await this.deps.stockTransactions.getCurrentStock(product.id);

        return {
          ...product,
          currentStock,
          deficit: product.reorderPoint - currentStock,
        };
      })
    );

    return {
      action: PRODUCT_COMMAND_ACTION.GET_LOW_STOCK,
      source: PRODUCT_COMMAND_SOURCE.AI,
      data: productsWithStock,
      refreshPaths: PRODUCT_REVALIDATE_PATHS,
    } satisfies ProductCommandResult<
      Array<Product & { currentStock: number; deficit: number }>
    >;
  }

  private assertCanManage(role: UserRole) {
    if (!PRODUCT_MANAGEMENT_ROLES.includes(role)) {
      throw new UnauthorizedError('No tienes permisos para gestionar productos');
    }
  }

  private async getProductById(id: string): Promise<Product> {
    const product = await this.deps.products.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }

    return product;
  }

  private async getProductBySkuOrThrow(sku: string): Promise<Product> {
    const product = await this.deps.products.findBySku(sku);
    if (!product) {
      throw new ProductNotFoundError(sku);
    }

    return product;
  }
}