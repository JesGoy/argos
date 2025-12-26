/**
 * User Domain Entity
 * Represents an authenticated user with role-based access
 */
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'warehouse_manager' | 'operator' | 'viewer';
  fullName?: string;
  createdAt: Date;
}

export type CreateUserInput = Omit<User, 'id' | 'createdAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>> & {
  passwordHash?: string;
};
