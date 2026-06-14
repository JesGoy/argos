import { z } from 'zod';
import { USER_ROLES } from '@/core/domain/constants/UserConstants';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Correo o usuario requerido'),
  password: z.string().min(8, 'Contraseña mínima 8 caracteres'),
});

// Public self-registration. The role is intentionally NOT accepted here: it is
// always assigned by RegisterUser ('viewer'). Role assignment for elevated
// accounts must go through an admin-only flow guarded by requireRole(['admin']).
export const registerSchema = z.object({
  username: z.string().min(3, 'Usuario mínimo 3 caracteres').max(50),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Contraseña mínima 8 caracteres'),
  fullName: z.string().max(100).optional(),
  organizationName: z.string().max(200).optional(),
});

// Admin-only teammate creation. Unlike public registration, the role IS
// accepted here because the action is guarded by requireRole(['admin']); the
// CreateUser use case re-checks the actor is an admin before honoring it.
export const createUserSchema = z.object({
  username: z.string().min(3, 'Usuario mínimo 3 caracteres').max(50),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Contraseña mínima 8 caracteres'),
  role: z.enum(USER_ROLES),
  fullName: z.string().max(100).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
