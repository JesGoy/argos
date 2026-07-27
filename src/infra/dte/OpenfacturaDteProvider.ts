import type {
  DteProvider,
  IssueBoletaInput,
  IssueCreditNoteInput,
  DteIssueResult,
} from '@/core/application/ports/DteProvider';
import {
  DTE_TYPE,
  DTE_ENVIRONMENT,
  RUT_CONSUMIDOR_FINAL,
  type DteEnvironment,
} from '@/core/domain/constants/DteConstants';
import {
  DteProviderConfigError,
  DteProviderRequestError,
  DteIdempotencyConflictError,
} from '@/core/domain/errors/DteErrors';

const BASE_URL: Record<DteEnvironment, string> = {
  certificacion: 'https://dev-api.haulmer.com',
  produccion: 'https://api.haulmer.com',
};

/**
 * Openfactura's public sandbox issuer (verified live in
 * scripts/spike-openfactura.mjs). `certificacion` always emits under this
 * identity, regardless of the tenant's real fiscal data, because the dev
 * environment's simulated CAF is tied to this specific demo apikey. This is
 * what lets any organization — and Argos itself, pre-launch — exercise the
 * full DTE flow at zero cost before a real SII certification exists.
 */
const CERTIFICACION_API_KEY = '928e15a2d14d4a6292345f04960f4bd3';
const CERTIFICACION_EMISOR_BOLETA = {
  RUTEmisor: '76795561-8',
  RznSocEmisor: 'HAULMER SPA',
  GiroEmisor: 'VENTA AL POR MENOR EN EMPRESAS DE VENTA A DISTANCIA VÍA INTERNET',
  CdgSIISucur: '81303347',
  DirOrigen: 'ARTURO PRAT 527 CURICO',
  CmnaOrigen: 'Curicó',
};
const CERTIFICACION_EMISOR_FACTURA = {
  RUTEmisor: '76795561-8',
  RznSoc: 'HAULMER SPA',
  GiroEmis: 'VENTA AL POR MENOR EN EMPRESAS DE VENTA A DISTANCIA VÍA INTERNET',
  Acteco: '479100',
  DirOrigen: 'ARTURO PRAT 527 CURICO',
  CmnaOrigen: 'Curicó',
};

type EmisorBoleta = typeof CERTIFICACION_EMISOR_BOLETA;
type EmisorFactura = typeof CERTIFICACION_EMISOR_FACTURA;

export interface OpenfacturaCredentials {
  environment: DteEnvironment;
  /** Decrypted production apikey. Required and used only in `produccion`. */
  apiKey?: string;
  rutEmisor?: string;
  razonSocial?: string;
  giro?: string;
  acteco?: string;
  direccion?: string;
  comuna?: string;
}

/**
 * DteProvider backed by Openfactura (Haulmer) — POST /v2/dte/document.
 * Payload shapes and quirks below are verified against the live sandbox in
 * scripts/spike-openfactura.mjs, not just the published docs:
 *   - Boleta (39) and Nota de Crédito (61) use DIFFERENT Emisor field names
 *     (RznSocEmisor/GiroEmisor vs RznSoc/GiroEmis) and different Detalle
 *     conventions (gross line amounts vs a single net-amount line).
 *   - `Folio` is always sent as 0; the real folio comes back in the response.
 */
export class OpenfacturaDteProvider implements DteProvider {
  constructor(private readonly credentials: OpenfacturaCredentials) {}

  async issueBoleta(input: IssueBoletaInput, idempotencyKey: string): Promise<DteIssueResult> {
    const { apiKey, emisorBoleta } = this.resolveCredentials();
    const fchEmis = formatFchEmis(input.emissionDate);

    const detalle = input.items.map((item, i) => ({
      NroLinDet: i + 1,
      NmbItem: item.description.slice(0, 80),
      QtyItem: item.quantity,
      PrcItem: item.unitPrice,
      MontoItem: item.totalPrice,
    }));

    const payload = {
      response: ['XML', 'PDF', 'FOLIO', '80MM'],
      dte: {
        Encabezado: {
          IdDoc: { TipoDTE: DTE_TYPE.BOLETA_AFECTA, Folio: 0, FchEmis: fchEmis, IndServicio: '3' },
          Emisor: emisorBoleta,
          Receptor: { RUTRecep: RUT_CONSUMIDOR_FINAL },
          Totales: {
            MntNeto: input.netAmount,
            IVA: input.taxAmount,
            MntTotal: input.totalAmount,
            TotalPeriodo: input.totalAmount,
            VlrPagar: input.totalAmount,
          },
        },
        Detalle: detalle,
      },
    };

    return this.emit(payload, apiKey, idempotencyKey);
  }

  async issueCreditNote(input: IssueCreditNoteInput, idempotencyKey: string): Promise<DteIssueResult> {
    const { apiKey, emisorFactura } = this.resolveCredentials();
    const fchEmis = formatFchEmis(input.emissionDate);

    const payload = {
      response: ['XML', 'PDF', 'FOLIO'],
      dte: {
        Encabezado: {
          IdDoc: { TipoDTE: DTE_TYPE.NOTA_CREDITO, Folio: 0, FchEmis: fchEmis },
          Emisor: emisorFactura,
          // No structured customer address is captured at the POS (most
          // sales have no customer at all), so a NC always targets the same
          // generic final-consumer receptor the boleta used.
          Receptor: {
            RUTRecep: RUT_CONSUMIDOR_FINAL,
            RznSocRecep: 'CONSUMIDOR FINAL',
            GiroRecep: 'PARTICULAR',
            DirRecep: 'SIN DIRECCION',
            CmnaRecep: emisorFactura.CmnaOrigen,
          },
          Totales: {
            MntNeto: input.netAmount,
            TasaIVA: '19',
            IVA: input.taxAmount,
            MntTotal: input.totalAmount,
          },
        },
        // NC detail lines are NET amounts (unlike a boleta's gross lines) and
        // the API recomputes IVA as 19% of their sum — a single synthetic
        // line carries the full net amount since CancelSale always cancels a
        // sale in full (no partial-refund line breakdown to preserve).
        Detalle: [
          {
            NroLinDet: 1,
            NmbItem: `Anula boleta electrónica folio ${input.referencedFolio}`.slice(0, 80),
            QtyItem: 1,
            PrcItem: input.netAmount,
            MontoItem: input.netAmount,
          },
        ],
        Referencia: [
          {
            NroLinRef: 1,
            TpoDocRef: String(DTE_TYPE.BOLETA_AFECTA),
            FolioRef: String(input.referencedFolio),
            FchRef: fchEmis,
            CodRef: '1', // 1 = anula el documento de referencia
          },
        ],
      },
    };

    return this.emit(payload, apiKey, idempotencyKey);
  }

  private resolveCredentials(): { apiKey: string; emisorBoleta: EmisorBoleta; emisorFactura: EmisorFactura } {
    if (this.credentials.environment === DTE_ENVIRONMENT.CERTIFICACION) {
      return {
        apiKey: CERTIFICACION_API_KEY,
        emisorBoleta: CERTIFICACION_EMISOR_BOLETA,
        emisorFactura: CERTIFICACION_EMISOR_FACTURA,
      };
    }

    const { apiKey, rutEmisor, razonSocial, giro, acteco, direccion, comuna } = this.credentials;
    if (!apiKey || !rutEmisor || !razonSocial || !giro || !acteco || !direccion || !comuna) {
      throw new DteProviderConfigError(
        'Faltan datos fiscales o la apikey de producción para emitir DTE — completa la configuración en /settings/dte.'
      );
    }
    return {
      apiKey,
      emisorBoleta: {
        RUTEmisor: rutEmisor,
        RznSocEmisor: razonSocial,
        GiroEmisor: giro,
        CdgSIISucur: '',
        DirOrigen: direccion,
        CmnaOrigen: comuna,
      },
      emisorFactura: {
        RUTEmisor: rutEmisor,
        RznSoc: razonSocial,
        GiroEmis: giro,
        Acteco: acteco,
        DirOrigen: direccion,
        CmnaOrigen: comuna,
      },
    };
  }

  private async emit(payload: unknown, apiKey: string, idempotencyKey: string): Promise<DteIssueResult> {
    const baseUrl = BASE_URL[this.credentials.environment];

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/v2/dte/document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new DteProviderRequestError(`no se pudo contactar a Openfactura: ${(err as Error).message}`);
    }

    const text = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      throw new DteProviderRequestError(`respuesta no-JSON de Openfactura (HTTP ${res.status}): ${text.slice(0, 300)}`);
    }

    if (!res.ok || json.error) {
      const error = json.error as { message?: string; code?: string; token?: string; details?: unknown } | undefined;
      if (error?.code === 'OF-06' && error.token) {
        throw new DteIdempotencyConflictError(error.token);
      }
      throw new DteProviderRequestError(error?.message ?? `HTTP ${res.status}`, error?.code, error?.details);
    }

    return {
      folio: json.FOLIO as number,
      token: json.TOKEN as string,
      pdfBase64: json.PDF as string,
      xmlBase64: json.XML as string,
      rawResponse: json,
    };
  }
}

/** `FchEmis` is `AAAA-MM-DD` in Chile's local calendar date, not UTC. */
function formatFchEmis(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(date);
}
