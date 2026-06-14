import { SupplierRepositoryDrizzle } from '@/infra/repositories/SupplierRepositoryDrizzle';
import type { SupplierRepository } from '@/core/application/ports/SupplierRepository';

export function makeSupplierRepository(organizationId: number): SupplierRepository {
  return new SupplierRepositoryDrizzle(organizationId);
}
