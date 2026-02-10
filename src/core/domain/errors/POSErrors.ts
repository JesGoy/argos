/**
 * Domain Error: Insufficient stock for sale
 */
export class InsufficientStockError extends Error {
  constructor(productName: string, available: number, requested: number) {
    super(
      `Stock insuficiente de "${productName}": disponible ${available}, solicitado ${requested}`
    );
    this.name = 'InsufficientStockError';
  }
}

/**
 * Domain Error: Sale not found
 */
export class SaleNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Venta no encontrada: ${identifier}`);
    this.name = 'SaleNotFoundError';
  }
}

/**
 * Domain Error: Invalid sale data
 */
export class InvalidSaleDataError extends Error {
  constructor(message: string) {
    super(`Datos de venta inválidos: ${message}`);
    this.name = 'InvalidSaleDataError';
  }
}

/**
 * Domain Error: Invalid payment method
 */
export class InvalidPaymentMethodError extends Error {
  constructor(method: string) {
    super(`Método de pago inválido: ${method}`);
    this.name = 'InvalidPaymentMethodError';
  }
}

/**
 * Domain Error: Sale already completed
 */
export class SaleAlreadyCompletedError extends Error {
  constructor(saleNumber: string) {
    super(`La venta ${saleNumber} ya está completada y no puede modificarse`);
    this.name = 'SaleAlreadyCompletedError';
  }
}

/**
 * Domain Error: Customer not found
 */
export class CustomerNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Cliente no encontrado: ${identifier}`);
    this.name = 'CustomerNotFoundError';
  }
}

/**
 * Domain Error: Customer credit limit exceeded
 */
export class CreditLimitExceededError extends Error {
  constructor(customerName: string, limit: number, attempted: number) {
    super(
      `Límite de crédito excedido para "${customerName}": límite $${limit}, intento $${attempted}`
    );
    this.name = 'CreditLimitExceededError';
  }
}

/**
 * Domain Error: Empty sale
 */
export class EmptySaleError extends Error {
  constructor() {
    super('No se puede procesar una venta sin productos');
    this.name = 'EmptySaleError';
  }
}
