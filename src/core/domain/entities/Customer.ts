/**
 * Customer Domain Entity
 * Represents a customer for tracking sales and credit
 */
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  currentDebt: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input type for creating a new customer
 */
export type CreateCustomerInput = Omit<Customer, 'id' | 'currentDebt' | 'createdAt' | 'updatedAt'>;

/**
 * Input type for updating a customer
 */
export type UpdateCustomerInput = Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>;
