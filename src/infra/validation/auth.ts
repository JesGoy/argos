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

export const forgotPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
});

export const resetPasswordSchema = z.object({
  pin: z.string().length(6, 'El PIN debe tener 6 dígitos'),
  newPassword: z.string().min(8, 'Contraseña mínima 8 caracteres'),
  confirmPassword: z.string().min(8, 'Contraseña de confirmación requerida'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
