import type { UserStatus } from '@/core/domain/constants/UserConstants';

/**
 * User Domain Entity
 * Represents an authenticated user with role-based access
 */
export interface User {
  id: string;
  organizationId: number;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'warehouse_manager' | 'operator' | 'viewer';
  /** Access state — suspended users cannot log in. */
  status: UserStatus;
  fullName?: string;
  createdAt: Date;
}

// `status` is omitted on create — new users default to 'active' at the DB.
export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'status'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>> & {
  passwordHash?: string;
};
