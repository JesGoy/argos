import bcrypt from 'bcryptjs';
import type { HashService } from '@/core/application/ports/HashService';

const SALT_ROUNDS = 10;

export class HashServiceBcrypt implements HashService {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
