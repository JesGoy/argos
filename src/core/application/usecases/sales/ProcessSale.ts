import type { Product } from '@/core/domain/entities/Product';
import type { Sale, CreateSaleInput } from '@/core/domain/entities/Sale';
import type { CreateSaleItemInput } from '@/core/domain/entities/SaleItem';
import type { CreateStockTransactionInput } from '@/core/domain/entities/StockTransaction';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { CustomerRepository } from '@/core/application/ports/CustomerRepository';
import type { RecipeRepository } from '@/core/application/ports/RecipeRepository';
import type { TransactionRunner } from '@/core/application/ports/TransactionRunner';
import { PaymentMethod } from '@/core/domain/constants/SaleConstants';
import { PAYMENT_METHOD, SALE_STATUS } from '@/core/domain/constants/SaleConstants';
import { TRANSACTION_TYPE } from '@/core/domain/constants/StockConstants';
import {
  EmptySaleError,
  InsufficientStockError,
  InvalidSaleDataError,
  CreditLimitExceededError,
} from '@/core/domain/errors/POSErrors';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';
import { CustomerNotFoundError } from '@/core/domain/errors/POSErrors';

export interface SaleItemInput {
  sku: string;
  quantity: number;
}

export interface ProcessSaleInput {
  items: SaleItemInput[];
  paymentMethod: PaymentMethod;
  userId: number;
  customerId?: string;
  notes?: string;
}

export interface ProcessSaleResult {
  sale: Sale;
  items: CreateSaleItemInput[];
}

/**
 * Use Case: Process Sale
 * Creates a sale transaction with items and adjusts inventory
 */
export class ProcessSale {
  constructor(
    private readonly deps: {
      sales: SaleRepository;
      saleItems: SaleItemRepository;
      products: ProductRepository;
      stockTransactions: StockTransactionRepository;
      customers: CustomerRepository;
      recipes: RecipeRepository;
      transaction: TransactionRunner;
    }
  ) {}

  async execute(input: ProcessSaleInput): Promise<ProcessSaleResult> {
    // Validate non-empty sale
    if (!input.items || input.items.length === 0) {
      throw new EmptySaleError();
    }

    // Validate customer if provided
    if (input.customerId) {
      const customer = await this.deps.customers.findById(input.customerId);
      if (!customer) {
        throw new CustomerNotFoundError(input.customerId);
      }
    }

    // 1. Resolve products and expand composites into actual stock deductions.
    // A composite (finished good, e.g. "Cappuccino") has no stock of its own — selling
    // it depletes its recipe ingredients. A simple product depletes itself.
    const productsMap = new Map<string, { product: Product; quantity: number }>();
    const deductionByProductId = new Map<string, number>();
    let totalAmount = 0;

    for (const item of input.items) {
      const product = await this.deps.products.findBySku(item.sku);
      if (!product) {
        throw new ProductNotFoundError(item.sku);
      }

      productsMap.set(item.sku, { product, quantity: item.quantity });
      totalAmount += item.quantity * product.sellingPrice;

      if (product.isComposite) {
        const components = await this.deps.recipes.findByFinishedProduct(product.id);
        if (components.length === 0) {
          throw new InvalidSaleDataError(
            `El producto ${product.sku} es compuesto pero no tiene receta definida.`
          );
        }
        for (const component of components) {
          const needed = component.quantityPerUnit * item.quantity;
          deductionByProductId.set(
            component.ingredientProductId,
            (deductionByProductId.get(component.ingredientProductId) ?? 0) + needed
          );
        }
      } else {
        deductionByProductId.set(
          product.id,
          (deductionByProductId.get(product.id) ?? 0) + item.quantity
        );
      }
    }

    // Check stock for every product to be deducted (ingredients aggregated across the cart).
    for (const [productId, needed] of deductionByProductId) {
      const currentStock = await this.deps.stockTransactions.getCurrentStock(productId);
      if (currentStock < needed) {
        const stockProduct = await this.deps.products.findById(productId);
        throw new InsufficientStockError(stockProduct?.name ?? productId, currentStock, needed);
      }
    }

    // 2. Check customer credit limit for on-account (non-cash) sales.
    // A cash sale is paid in full at the point of sale and never creates debt;
    // only deferred (non-cash) sales to a registered customer draw on credit.
    const isOnAccount = !!input.customerId && input.paymentMethod !== PAYMENT_METHOD.CASH;
    if (isOnAccount) {
      const customer = await this.deps.customers.findById(input.customerId!);
      if (customer) {
        const newDebt = customer.currentDebt + totalAmount;
        if (newDebt > customer.creditLimit) {
          throw new CreditLimitExceededError(customer.name, customer.creditLimit, newDebt);
        }
      }
    }

    // 3. Generate sale number
    const saleNumber = await this.deps.sales.generateSaleNumber();

    const saleInput: CreateSaleInput = {
      userId: input.userId,
      customerId: input.customerId,
      totalAmount,
      paymentMethod: input.paymentMethod,
      status: SALE_STATUS.COMPLETED,
      notes: input.notes,
      completedAt: new Date(),
    };

    // 4-8. Persist sale + items + stock movements (+ debt) atomically: a failure
    // mid-way must not leave a sale without its stock decrement or debt update.
    return this.deps.transaction.run(async (tx) => {
      const sale = await this.deps.sales.create(saleInput, tx);

      // Sale items record what the customer bought (the finished goods).
      const saleItemsInput: CreateSaleItemInput[] = Array.from(productsMap.values()).map(
        ({ product, quantity }) => ({
          saleId: sale.id,
          productId: product.id,
          sku: product.sku,
          productName: product.name,
          quantity,
          unitPrice: product.sellingPrice,
          subtotal: product.sellingPrice * quantity,
        })
      );

      // Stock movements record what actually left inventory (ingredients for composites,
      // the product itself for simple goods), aggregated per product.
      const stockTransactionsInput: CreateStockTransactionInput[] = Array.from(
        deductionByProductId.entries()
      ).map(([productId, quantity]) => ({
        productId,
        type: TRANSACTION_TYPE.SALE,
        quantity: -quantity, // Negative for sale
        reason: `Venta ${saleNumber}`,
        userId: input.userId,
        saleId: sale.id,
      }));

      await this.deps.saleItems.createBatch(saleItemsInput, tx);
      await this.deps.stockTransactions.createBatch(stockTransactionsInput, tx);

      if (isOnAccount) {
        await this.deps.customers.updateDebt(input.customerId!, totalAmount, tx);
      }

      return {
        sale,
        items: saleItemsInput,
      };
    });
  }
}
