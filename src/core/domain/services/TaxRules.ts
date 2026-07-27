import { IVA_RATE } from '@/core/domain/constants/DteConstants';
import { InvalidTaxAmountError } from '@/core/domain/errors/DteErrors';

/**
 * Chilean DTE amounts are whole CLP pesos — the SII (and every DTE provider)
 * rejects decimals, unlike the rest of Argos's domain, which stores money as
 * integer cents to stay currency-agnostic. This is the single conversion
 * point between the two: it runs once, when a Sale (stored in cents) is
 * turned into a DteDocument (stored in pesos), and nowhere else.
 */
export function centsToClp(cents: number): number {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new InvalidTaxAmountError(`el monto en centavos debe ser un entero no negativo, recibido ${cents}`);
  }
  if (cents % 100 !== 0) {
    throw new InvalidTaxAmountError(`monto en centavos no es múltiplo de 100 (CLP no tiene decimales): ${cents}`);
  }
  return cents / 100;
}

export interface IvaSplit {
  netAmount: number;
  taxAmount: number;
}

/**
 * Splits an IVA-inclusive total (as charged at the POS) into net + IVA,
 * "backwards" from the total the way the SII/Openfactura validate it:
 * net = round(total / 1.19), iva = total - net. Verified against the
 * Openfactura sandbox (see scripts/spike-openfactura.mjs): a $6.800 total
 * splits into net $5.714 + IVA $1.086, and the API accepts exactly that.
 */
export function splitIva(totalClp: number): IvaSplit {
  if (!Number.isInteger(totalClp) || totalClp < 0) {
    throw new InvalidTaxAmountError(`el monto total debe ser un entero no negativo, recibido ${totalClp}`);
  }
  const netAmount = Math.round(totalClp / (1 + IVA_RATE));
  return { netAmount, taxAmount: totalClp - netAmount };
}
