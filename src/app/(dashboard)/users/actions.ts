'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import {
  USER_ROLE,
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from '@/core/domain/constants/UserConstants';
import type { PlanLimitType, PlanType } from '@/core/domain/constants/BillingConstants';
import { makeChangeUserRole, makeCreateUser, makeSetUserStatus } from '@/infra/container/auth';
import { DuplicateUserError, UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { PlanLimitExceededError } from '@/core/domain/errors/BillingErrors';
import { createUserSchema } from '@/infra/validation/auth';
import { USER_REVALIDATE_PATHS } from '@/config/routes';
import { logger } from '@/infra/observability/logger';

export interface ChangeRoleResult {
  success?: boolean;
  error?: string;
}

export interface CreateUserFormState {
  success?: boolean;
  error?: string;
  /** Carries plan-limit info so the form can render the upgrade CTA. */
  limit?: {
    limitType: PlanLimitType;
    current: number;
    max: number;
    plan: PlanType;
  };
  fieldErrors?: {
    username?: string[];
    email?: string[];
    password?: string[];
    role?: string[];
    fullName?: string[];
  };
}

export async function changeUserRoleAction(
  targetUserId: string,
  newRole: string
): Promise<ChangeRoleResult> {
  const session = await requireRole([USER_ROLE.ADMIN]);

  if (!USER_ROLES.includes(newRole as UserRole)) {
    return { error: 'Rol inválido' };
  }

  try {
    const uc = makeChangeUserRole();
    await uc.execute(session, { targetUserId, newRole: newRole as UserRole });
    for (const path of USER_REVALIDATE_PATHS) revalidatePath(path);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    if (err instanceof Error) return { error: err.message };
    logger.error('users.change_role.failed', { component: 'users', targetUserId }, err);
    return { error: 'No se pudo actualizar el rol' };
  }
}

export async function createUserAction(
  _prevState: CreateUserFormState,
  formData: FormData
): Promise<CreateUserFormState> {
  const session = await requireRole([USER_ROLE.ADMIN]);

  const parsed = createUserSchema.safeParse({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
    fullName: (formData.get('fullName') as string | null) || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const uc = makeCreateUser();
    await uc.execute(session, parsed.data);
    for (const path of USER_REVALIDATE_PATHS) revalidatePath(path);
    return { success: true };
  } catch (err) {
    if (err instanceof PlanLimitExceededError) {
      return {
        error: err.message,
        limit: {
          limitType: err.limitType,
          current: err.current,
          max: err.max,
          plan: err.plan,
        },
      };
    }
    if (err instanceof DuplicateUserError) return { error: err.message };
    if (err instanceof UnauthorizedError) return { error: err.message };
    if (err instanceof Error) return { error: err.message };
    logger.error('users.create.failed', { component: 'users' }, err);
    return { error: 'No se pudo crear el usuario' };
  }
}

export async function setUserStatusAction(
  targetUserId: string,
  status: string
): Promise<ChangeRoleResult> {
  const session = await requireRole([USER_ROLE.ADMIN]);

  if (!USER_STATUSES.includes(status as UserStatus)) {
    return { error: 'Estado inválido' };
  }

  try {
    const uc = makeSetUserStatus();
    await uc.execute(session, { targetUserId, status: status as UserStatus });
    for (const path of USER_REVALIDATE_PATHS) revalidatePath(path);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    if (err instanceof Error) return { error: err.message };
    logger.error('users.set_status.failed', { component: 'users', targetUserId }, err);
    return { error: 'No se pudo actualizar el estado' };
  }
}
