import { describe, it, expect, beforeAll } from 'vitest';
import { encryptApiKey, decryptApiKey } from '@/infra/security/ApiKeyCipher';

beforeAll(() => {
  process.env.DTE_ENCRYPTION_KEY = 'a'.repeat(32);
});

describe('ApiKeyCipher', () => {
  it('decrypts back to the original plaintext', () => {
    const plaintext = 'sk_live_openfactura_abc123';
    expect(decryptApiKey(encryptApiKey(plaintext))).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext each time (random IV)', () => {
    const a = encryptApiKey('same-key');
    const b = encryptApiKey('same-key');
    expect(a).not.toBe(b);
    expect(decryptApiKey(a)).toBe('same-key');
    expect(decryptApiKey(b)).toBe('same-key');
  });

  it('rejects a tampered ciphertext (auth tag mismatch)', () => {
    const encoded = encryptApiKey('sensitive-value');
    const raw = Buffer.from(encoded, 'base64');
    raw[raw.length - 1] ^= 0xff; // flip a byte in the ciphertext
    expect(() => decryptApiKey(raw.toString('base64'))).toThrow();
  });
});
