'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import {
  PRODUCT_MANAGEMENT_ROLES,
  SALES_AUTHORIZED_ROLES,
} from '@/core/domain/constants/UserConstants';
import { makeSupplierRepository } from '@/infra/container/suppliers';
import { supplierSchema } from '@/infra/validation/supplier';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { SUPPLIER_REVALIDATE_PATHS } from '@/config/routes';

export interface SupplierFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    name?: string[];
    phone?: string[];
    email?: string[];
    leadTimeDays?: string[];
  };
}

export async function createSupplierAction(
  _prev: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);

  const parsed = supplierSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    leadTimeDays: formData.get('leadTimeDays'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const repo = makeSupplierRepository(session.organizationId);
    await repo.create({
      name: parsed.data.name,
      phone: parsed.data.phone || undefined,
      email: parsed.data.email || undefined,
      leadTimeDays: parsed.data.leadTimeDays,
    });

    for (const path of SUPPLIER_REVALIDATE_PATHS) revalidatePath(path);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    return { error: 'Error al crear proveedor' };
  }
}

export async function deleteSupplierAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);

  try {
    const repo = makeSupplierRepository(session.organizationId);
    await repo.delete(id);
    for (const path of SUPPLIER_REVALIDATE_PATHS) revalidatePath(path);
    return { success: true };
  } catch {
    return { error: 'Error al eliminar proveedor' };
  }
}

export async function getSuppliersForSelect(): Promise<{ id: string; name: string }[]> {
  const session = await requireRole([...SALES_AUTHORIZED_ROLES]);
  const repo = makeSupplierRepository(session.organizationId);
  const all = await repo.findAll();
  return all.map((s) => ({ id: s.id, name: s.name }));
}
