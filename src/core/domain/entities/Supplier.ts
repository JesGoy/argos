/**
 * Supplier Domain Entity
 * Vendor/proveedor that supplies products. Optional on stock-in transactions.
 */
export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  /** Average days between PO placement and receipt; used for reorder suggestions. */
  leadTimeDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierInput {
  name: string;
  phone?: string;
  email?: string;
  leadTimeDays?: number;
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string;
  email?: string;
  leadTimeDays?: number;
}
