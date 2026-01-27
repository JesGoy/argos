import { PasswordReset, CreatePasswordResetInput } from '@/core/domain/entities/PasswordReset';

export interface PasswordResetRepository {
  create(input: CreatePasswordResetInput): Promise<PasswordReset>;
  findByPin(pin: string): Promise<PasswordReset | undefined>;
  findById(id: string): Promise<PasswordReset | undefined>;
  markAsUsed(id: string): Promise<void>;
  deleteById(id: string): Promise<void>;
}
