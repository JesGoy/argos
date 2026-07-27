import { describe, it, expect } from 'vitest';
import { centsToClp, splitIva } from '@/core/domain/services/TaxRules';
import { InvalidTaxAmountError } from '@/core/domain/errors/DteErrors';

describe('centsToClp', () => {
  it('converts whole-peso cents to CLP pesos', () => {
    expect(centsToClp(680000)).toBe(6800);
  });

  it('rejects amounts that are not a multiple of 100', () => {
    expect(() => centsToClp(680050)).toThrow(InvalidTaxAmountError);
  });

  it('rejects negative amounts', () => {
    expect(() => centsToClp(-100)).toThrow(InvalidTaxAmountError);
  });
});

describe('splitIva', () => {
  it('matches the Openfactura sandbox result for a $6.800 total', () => {
    // Verified live against dev-api.haulmer.com in scripts/spike-openfactura.mjs
    expect(splitIva(6800)).toEqual({ netAmount: 5714, taxAmount: 1086 });
  });

  it('produces net + tax that always reconstructs the total', () => {
    for (const total of [0, 1, 100, 999, 1000, 12345, 999999]) {
      const { netAmount, taxAmount } = splitIva(total);
      expect(netAmount + taxAmount).toBe(total);
    }
  });

  it('rejects non-integer or negative totals', () => {
    expect(() => splitIva(-1)).toThrow(InvalidTaxAmountError);
    expect(() => splitIva(10.5)).toThrow(InvalidTaxAmountError);
  });
});
