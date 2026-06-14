import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from '@/core/domain/entities/Supplier';

/**
 * Supplier Repository Port
 * Contract for supplier (proveedor) data access operations.
 */
export interface SupplierRepository {
  findAll(): Promise<Supplier[]>;
  findById(id: string): Promise<Supplier | null>;
  create(input: CreateSupplierInput): Promise<Supplier>;
  update(id: string, input: UpdateSupplierInput): Promise<void>;
  delete(id: string): Promise<void>;
}
