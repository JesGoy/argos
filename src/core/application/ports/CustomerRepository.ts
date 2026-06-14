import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '@/core/domain/entities/Customer';

/**
 * Customer Repository Port
 * Contract for customer data access operations
 */
export interface CustomerRepository {
  /**
   * Find a customer by ID
   */
  findById(id: string): Promise<Customer | null>;

  /**
   * Find customers by search term (name, phone, email)
   */
  search(searchTerm: string): Promise<Customer[]>;

  /**
   * Find all customers
   */
  findAll(): Promise<Customer[]>;

  /**
   * Find customers with outstanding debt
   */
  findWithDebt(): Promise<Customer[]>;

  /**
   * Create a new customer
   */
  create(input: CreateCustomerInput): Promise<Customer>;

  /**
   * Update an existing customer
   */
  update(id: string, input: UpdateCustomerInput): Promise<void>;

  /**
   * Increment customer debt by `amount`. Pass `executor` to run inside a transaction.
   */
  updateDebt(id: string, amount: number, executor?: unknown): Promise<void>;

  /**
   * Delete a customer
   */
  delete(id: string): Promise<void>;
}
