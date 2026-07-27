/**
 * DTE (Documento Tributario Electrónico) Domain Constants
 * Single source of truth for Chile's SII electronic-document values.
 */

/**
 * SII document type codes relevant to a point-of-sale flow: boleta afecta,
 * boleta exenta, and the nota de crédito used to cancel either one.
 */
export const DTE_TYPES = [39, 41, 61] as const;

export type DteType = (typeof DTE_TYPES)[number];

export const DTE_TYPE = {
  BOLETA_AFECTA: 39 as const,
  BOLETA_EXENTA: 41 as const,
  NOTA_CREDITO: 61 as const,
} as const;

export const DTE_TYPE_LABELS: Record<DteType, string> = {
  39: 'Boleta Electrónica Afecta',
  41: 'Boleta Electrónica Exenta',
  61: 'Nota de Crédito Electrónica',
} as const;

/**
 * Lifecycle of a DteDocument outbox row. `sent` exists for providers whose
 * acceptance is asynchronous (a future direct-SII adapter polls by trackid);
 * Openfactura's REST call resolves straight to `accepted`/`rejected`.
 */
export const DTE_STATUSES = ['pending', 'sent', 'accepted', 'rejected', 'failed', 'cancelled'] as const;

export type DteStatus = (typeof DTE_STATUSES)[number];

export const DTE_STATUS = {
  PENDING: 'pending' as const,
  SENT: 'sent' as const,
  ACCEPTED: 'accepted' as const,
  REJECTED: 'rejected' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

export const DTE_STATUS_LABELS: Record<DteStatus, string> = {
  pending: 'Pendiente de envío',
  sent: 'Enviada al SII',
  accepted: 'Aceptada por el SII',
  rejected: 'Rechazada por el SII',
  failed: 'Error de emisión',
  cancelled: 'Anulada',
} as const;

/** Same bg/text badge convention as SALE_STATUS_COLORS. */
export const DTE_STATUS_COLORS: Record<DteStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-800' },
  accepted: { bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
} as const;

/**
 * `certificacion` always issues against the provider's sandbox using its demo
 * issuer, regardless of the organization's real fiscal data — that data is
 * only read/sent in `produccion`. Lets every org (and Argos itself, pre-launch)
 * exercise the full flow at zero cost before a real SII certification exists.
 */
export const DTE_ENVIRONMENTS = ['certificacion', 'produccion'] as const;

export type DteEnvironment = (typeof DTE_ENVIRONMENTS)[number];

export const DTE_ENVIRONMENT = {
  CERTIFICACION: 'certificacion' as const,
  PRODUCCION: 'produccion' as const,
} as const;

export const DTE_ENVIRONMENT_LABELS: Record<DteEnvironment, string> = {
  certificacion: 'Certificación (pruebas)',
  produccion: 'Producción',
} as const;

/**
 * DTE issuing providers behind the (future) `DteProvider` port. Only one
 * today; kept as data (not a hardcoded branch) so adding a second provider
 * is a config value, not a code change.
 */
export const DTE_PROVIDERS = ['openfactura'] as const;

export type DteProviderName = (typeof DTE_PROVIDERS)[number];

export const DTE_PROVIDER = {
  OPENFACTURA: 'openfactura' as const,
} as const;

/** Chile's current VAT rate, applied "backwards" from IVA-inclusive totals. */
export const IVA_RATE = 0.19;

/**
 * Res. Ex. SII N°74/2020: each DTE must reach the SII within this many
 * minutes of being generated. Drives the retry worker's urgency and any
 * "overdue" alerting on the outbox.
 */
export const DTE_MAX_SEND_DELAY_MINUTES = 60;

/** Generic RUT used as `RUTRecep` for boletas issued to a final consumer. */
export const RUT_CONSUMIDOR_FINAL = '66666666-6';
