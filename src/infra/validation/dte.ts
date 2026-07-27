import { z } from 'zod';
import { DTE_ENVIRONMENTS } from '@/core/domain/constants/DteConstants';

export const updateDteConfigSchema = z
  .object({
    enabled: z.coerce.boolean(),
    environment: z.enum(DTE_ENVIRONMENTS),
    rutEmisor: z.string().max(12).optional().or(z.literal('')),
    razonSocial: z.string().max(200).optional().or(z.literal('')),
    giro: z.string().max(200).optional().or(z.literal('')),
    acteco: z.string().max(10).optional().or(z.literal('')),
    direccion: z.string().max(200).optional().or(z.literal('')),
    comuna: z.string().max(100).optional().or(z.literal('')),
    apiKey: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) =>
      data.environment !== 'produccion' ||
      !!(data.rutEmisor && data.razonSocial && data.giro && data.acteco && data.direccion && data.comuna),
    { message: 'Completa todos los datos fiscales para operar en producción' }
  );

export type UpdateDteConfigSchema = z.infer<typeof updateDteConfigSchema>;
