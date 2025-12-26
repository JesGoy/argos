import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Correo o usuario requerido'),
  password: z.string().min(6, 'Contraseña requerida'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Usuario mínimo 3 caracteres').max(50),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Contraseña mínima 8 caracteres'),
  fullName: z.string().max(100).optional(),
  role: z.enum(['admin', 'warehouse_manager', 'operator', 'viewer']).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
