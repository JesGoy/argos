import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { StockTransaction } from '@/core/domain/entities/StockTransaction';
import { STOCK_AI_ACTION, type StockAIAction, TRANSACTION_TYPE } from '@/core/domain/constants/StockConstants';
import { PRODUCT_COMMAND_SOURCE, type ProductCommandSource } from '@/core/domain/constants/ProductConstants';
import { SALES_AUTHORIZED_ROLES, type UserRole } from '@/core/domain/constants/UserConstants';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';
import { InsufficientStockError } from '@/core/domain/errors/POSErrors';
import { STOCK_REVALIDATE_PATHS } from '@/config/routes';

export interface StockCommandActor {
  userId: number;
  role: UserRole;
  source: ProductCommandSource;
}

export interface StockInInput {
  sku: string;
  quantity: number;
  reason?: string;
  referenceNumber?: string;
}

export interface StockOutInput {
  sku: string;
  quantity: number;
  reason?: string;
}

export interface StockOutConfirmation {
  action: StockAIAction;
  sku: string;
  productName: string;
  productId: string;
  quantity: number;
  reason: string;
}

export interface StockCommandResult<T = unknown> {
  action: StockAIAction | string;
  data: T;
  refreshPaths: readonly string[];
}

export class StockCommandService {
  constructor(
    private readonly deps: {
      products: ProductRepository;
      stockTransactions: StockTransactionRepository;
    }
  ) {}

  async stockIn(
    actor: StockCommandActor,
    input: StockInInput
  ): Promise<StockCommandResult<StockTransaction>> {
    this.assertCanManageStock(actor.role);

    const product = await this.deps.products.findBySku(input.sku);
    if (!product) throw new ProductNotFoundError(input.sku);

    const transaction = await this.deps.stockTransactions.create({
      productId: product.id,
      type: TRANSACTION_TYPE.PURCHASE,
      quantity: input.quantity,
      reason: input.reason ?? 'Entrada de stock',
      userId: actor.userId,
      referenceNumber: input.referenceNumber,
    });

    return {
      action: STOCK_AI_ACTION.STOCK_IN,
      data: transaction,
      refreshPaths: STOCK_REVALIDATE_PATHS,
    };
  }

  async buildStockOutConfirmation(
    actor: StockCommandActor,
    input: StockOutInput
  ): Promise<StockOutConfirmation> {
    this.assertCanManageStock(actor.role);

    const product = await this.deps.products.findBySku(input.sku);
    if (!product) throw new ProductNotFoundError(input.sku);

    const currentStock = await this.deps.stockTransactions.getCurrentStock(product.id);
    if (currentStock < input.quantity) {
      throw new InsufficientStockError(product.name, currentStock, input.quantity);
    }

    return {
      action: STOCK_AI_ACTION.STOCK_OUT,
      sku: input.sku,
      productName: product.name,
      productId: product.id,
      quantity: input.quantity,
      reason: input.reason ?? 'Salida de stock',
    };
  }

  async executeStockOut(
    actor: StockCommandActor,
    confirmation: StockOutConfirmation
  ): Promise<StockCommandResult<StockTransaction>> {
    this.assertCanManageStock(actor.role);

    const currentStock = await this.deps.stockTransactions.getCurrentStock(confirmation.productId);
    if (currentStock < confirmation.quantity) {
      throw new InsufficientStockError(confirmation.productName, currentStock, confirmation.quantity);
    }

    const transaction = await this.deps.stockTransactions.create({
      productId: confirmation.productId,
      type: TRANSACTION_TYPE.ADJUSTMENT,
      quantity: -confirmation.quantity,
      reason: confirmation.reason,
      userId: actor.userId,
    });

    return {
      action: STOCK_AI_ACTION.STOCK_OUT,
      data: transaction,
      refreshPaths: STOCK_REVALIDATE_PATHS,
    };
  }

  async getRecentTransactions(sku: string): Promise<StockCommandResult<StockTransaction[]>> {
    const product = await this.deps.products.findBySku(sku);
    if (!product) throw new ProductNotFoundError(sku);

    const transactions = await this.deps.stockTransactions.findByProductId(product.id);

    return {
      action: STOCK_AI_ACTION.GET_HISTORY,
      data: transactions.slice(0, 20),
      refreshPaths: [],
    };
  }

  static makeActor(userId: number, role: UserRole, source: ProductCommandSource = PRODUCT_COMMAND_SOURCE.AI): StockCommandActor {
    return { userId, role, source };
  }

  private assertCanManageStock(role: UserRole): void {
    if (!SALES_AUTHORIZED_ROLES.includes(role)) {
      throw new UnauthorizedError(`El rol '${role}' no tiene permisos para gestionar stock`);
    }
  }
}
