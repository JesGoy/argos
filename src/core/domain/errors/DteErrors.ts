/**
 * Domain Error: Invalid amount passed to a DTE tax calculation
 */
export class InvalidTaxAmountError extends Error {
  constructor(message: string) {
    super(`Monto inválido para cálculo tributario: ${message}`);
    this.name = 'InvalidTaxAmountError';
  }
}

/**
 * Domain Error: DteConfig not found for an organization
 */
export class DteConfigNotFoundError extends Error {
  constructor(organizationId: number | string) {
    super(`Configuración DTE no encontrada para la organización: ${organizationId}`);
    this.name = 'DteConfigNotFoundError';
  }
}

/**
 * Domain Error: DteDocument not found
 */
export class DteDocumentNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Documento DTE no encontrado: ${identifier}`);
    this.name = 'DteDocumentNotFoundError';
  }
}

/**
 * Domain Error: a DteProvider is missing the configuration it needs to issue
 * (e.g. `produccion` selected without a full set of fiscal data + apikey).
 */
export class DteProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DteProviderConfigError';
  }
}

/**
 * Domain Error: a DteProvider rejected or failed to process an emission
 * request. Carries the provider's own error code/details (e.g. Openfactura's
 * `OF-xx`) so callers can log or branch on it without parsing the message.
 */
export class DteProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(`Error del proveedor DTE: ${message}`);
    this.name = 'DteProviderRequestError';
  }
}

/**
 * Domain Error: the provider reports this exact document was already issued
 * under the given idempotency key (e.g. Openfactura's `OF-06`) — recoverable
 * via the returned `token`, not a hard failure. Retrying blind would risk
 * losing track of an already-accepted document, so this is a distinct type
 * from `DteProviderRequestError` and callers must handle it explicitly.
 */
export class DteIdempotencyConflictError extends Error {
  constructor(public readonly token: string) {
    super(`El documento ya fue emitido bajo esta llave de idempotencia (token: ${token})`);
    this.name = 'DteIdempotencyConflictError';
  }
}
