import type { Sale, CreateSaleInput } from '@/core/domain/entities/Sale';
import type { CreateSaleItemInput } from '@/core/domain/entities/SaleItem';
import type { CreateStockTransactionInput } from '@/core/domain/entities/StockTransaction';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { CustomerRepository } from '@/core/application/ports/CustomerRepository';
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

    // 1. Validate products exist and check stock availability
    const productsMap = new Map<string, any>();
    let totalAmount = 0;

    for (const item of input.items) {
      const product = await this.deps.products.findBySku(item.sku);
      if (!product) {
        throw new ProductNotFoundError(item.sku);
      }

      // Check stock availability
      const currentStock = await this.deps.stockTransactions.getCurrentStock(product.id);
      if (currentStock < item.quantity) {
        throw new InsufficientStockError(product.name, currentStock, item.quantity);
      }

      productsMap.set(item.sku, { product, quantity: item.quantity });
      
      // Calculate total (assuming we use a base price - you may want to add price to Product entity)
      // For now, we'll need to get price from somewhere - let's assume it's in the product
      totalAmount += item.quantity * 10; // Placeholder - needs actual pricing logic
    }

    // 2. Check customer credit limit if applicable
    if (input.customerId && input.paymentMethod === PAYMENT_METHOD.CASH) {
      const customer = await this.deps.customers.findById(input.customerId);
      if (customer) {
        const newDebt = customer.currentDebt + totalAmount;
        if (newDebt > customer.creditLimit) {
          throw new CreditLimitExceededError(customer.name, customer.creditLimit, newDebt);
        }
      }
    }

    // 3. Generate sale number
    const saleNumber = await this.deps.sales.generateSaleNumber();

    // 4. Create sale
    const saleInput: CreateSaleInput = {
      userId: input.userId,
      customerId: input.customerId,
      totalAmount,
      paymentMethod: input.paymentMethod,
      status: SALE_STATUS.COMPLETED,
      notes: input.notes,
      completedAt: new Date(),
    };

    const sale = await this.deps.sales.create(saleInput);

    // 5. Create sale items
    const saleItemsInput: CreateSaleItemInput[] = [];
    const stockTransactionsInput: CreateStockTransactionInput[] = [];

    for (const item of input.items) {
      const { product, quantity } = productsMap.get(item.sku)!;

      const unitPrice = 10; // Placeholder - needs actual pricing
      const subtotal = unitPrice * quantity;

      saleItemsInput.push({
        saleId: sale.id,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity,
        unitPrice,
        subtotal,
      });

      // Create stock transaction for the sale
      stockTransactionsInput.push({
        productId: product.id,
        type: TRANSACTION_TYPE.SALE,
        quantity: -quantity, // Negative for sale
        reason: `Venta ${saleNumber}`,
        userId: input.userId,
        saleId: sale.id,
      });
    }

    // 6. Save sale items
    await this.deps.saleItems.createBatch(saleItemsInput);

    // 7. Save stock transactions (adjust inventory)
    await this.deps.stockTransactions.createBatch(stockTransactionsInput);

    // 8. Update customer debt if applicable
    if (input.customerId && input.paymentMethod === PAYMENT_METHOD.CASH) {
      await this.deps.customers.updateDebt(input.customerId, totalAmount);
    }

    return {
      sale,
      items: saleItemsInput,
    };
  }
}
