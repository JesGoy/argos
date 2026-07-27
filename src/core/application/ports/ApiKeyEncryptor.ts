/**
 * Abstracts at-rest encryption for third-party provider API keys (e.g.
 * DteConfig.apiKeyEncrypted), so use cases never depend on the concrete
 * crypto implementation directly — same reasoning as HashService for
 * passwords.
 */
export interface ApiKeyEncryptor {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}
