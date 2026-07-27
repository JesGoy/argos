import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';

/**
 * AES-256-GCM encryption for provider API keys at rest (DteConfig.apiKeyEncrypted).
 * Each tenant's production apikey is a real secret (billing-equivalent risk if
 * leaked) and must never be stored or logged in plaintext.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.DTE_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('DTE_ENCRYPTION_KEY must be defined and at least 32 chars long');
  }
  // Derives a stable 32-byte key from the configured secret so the operator
  // only has to provide a long passphrase, not raw key bytes in some encoding.
  return scryptSync(secret, 'argos-dte-config', 32);
}

/** Encrypts a plaintext API key. Output is safe to store in a text column. */
export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/** Reverses `encryptApiKey`. Throws if the ciphertext was tampered with. */
export function decryptApiKey(encoded: string): string {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
