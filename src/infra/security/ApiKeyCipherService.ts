import type { ApiKeyEncryptor } from '@/core/application/ports/ApiKeyEncryptor';
import { encryptApiKey, decryptApiKey } from '@/infra/security/ApiKeyCipher';

export class ApiKeyCipherService implements ApiKeyEncryptor {
  encrypt(plaintext: string): string {
    return encryptApiKey(plaintext);
  }

  decrypt(ciphertext: string): string {
    return decryptApiKey(ciphertext);
  }
}
