import { z } from 'zod';
import { BUSINESS_TYPES } from '@/core/domain/constants/OrganizationConstants';

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  businessType: z.enum(BUSINESS_TYPES, { message: 'Tipo de negocio inválido' }),
  currency: z.string().min(3, 'Código de moneda de 3 letras').max(3).toUpperCase(),
  timezone: z.string().min(1, 'Zona horaria requerida').max(64),
});

export type UpdateOrganizationSchema = z.infer<typeof updateOrganizationSchema>;
