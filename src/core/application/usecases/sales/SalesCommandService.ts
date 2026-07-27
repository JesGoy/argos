import type { ProcessSale, ProcessSaleInput, ProcessSaleResult } from '@/core/application/usecases/sales/ProcessSale';
import type { CancelSale } from '@/core/application/usecases/sales/CancelSale';
import type { IssueDteForSale } from '@/core/application/usecases/dte/IssueDteForSale';
import type { IssueCreditNoteForSale } from '@/core/application/usecases/dte/IssueCreditNoteForSale';
import type { DteDocument } from '@/core/domain/entities/DteDocument';
import {
  SALE_COMMAND_ACTION,
  type SaleCommandAction,
} from '@/core/domain/constants/SaleConstants';
import { PRODUCT_COMMAND_SOURCE, type ProductCommandSource } from '@/core/domain/constants/ProductConstants';
import { SALES_AUTHORIZED_ROLES, type UserRole } from '@/core/domain/constants/UserConstants';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { SALES_REVALIDATE_PATHS } from '@/config/routes';

export interface ProcessSaleCommandData extends ProcessSaleResult {
  /** `null` when the org hasn't enabled DTE; otherwise the boleta's current state. */
  dte: DteDocument | null;
}

export interface SalesCommandActor {
  userId: number;
  role: UserRole;
  source: ProductCommandSource;
}

export interface SalesCommandResult<T = unknown> {
  action: SaleCommandAction;
  data: T;
  refreshPaths: readonly string[];
}

/**
 * Single entry point for sale mutations across channels (manual UI + AI),
 * owning the role check and the UI refresh hints. The atomic transaction itself
 * lives inside ProcessSale / CancelSale; this service composes them with
 * authorization and an actor (so the channel never passes a raw userId).
 */
export class SalesCommandService {
  constructor(
    private readonly deps: {
      processSale: ProcessSale;
      cancelSale: CancelSale;
      issueDteForSale: IssueDteForSale;
      issueCreditNoteForSale: IssueCreditNoteForSale;
    }
  ) {}

  async processSale(
    actor: SalesCommandActor,
    input: Omit<ProcessSaleInput, 'userId'>
  ): Promise<SalesCommandResult<ProcessSaleCommandData>> {
    this.assertCanSell(actor.role);

    const data = await this.deps.processSale.execute({ ...input, userId: actor.userId });

    // DTE issuance is a best-effort side effect: it must never turn a
    // completed sale into a failed one, even on a bug in this path — the
    // boleta can always be retried later (RetryPendingDtes), but a sale that
    // silently failed to save would lose real revenue tracking. A no-op
    // (org hasn't enabled DTE) and a provider failure both resolve quietly
    // (as a `dte.status` the caller can render); only a genuinely unexpected
    // error is caught here, since IssueDteForSale itself already persists
    // provider-shaped failures as a `failed` row.
    let dte: DteDocument | null = null;
    try {
      dte = await this.deps.issueDteForSale.execute({ saleId: data.sale.id });
    } catch {
      // Swallowed by design — see comment above.
    }

    return {
      action: SALE_COMMAND_ACTION.PROCESS_SALE,
      data: { ...data, dte },
      refreshPaths: SALES_REVALIDATE_PATHS,
    };
  }

  async cancelSale(
    actor: SalesCommandActor,
    saleId: string
  ): Promise<SalesCommandResult<{ saleId: string }>> {
    this.assertCanSell(actor.role);

    await this.deps.cancelSale.execute(saleId, actor.userId);

    // Same best-effort contract as processSale above: voiding the boleta via
    // Nota de Crédito must never block the cancellation itself succeeding.
    try {
      await this.deps.issueCreditNoteForSale.execute({ saleId });
    } catch {
      // Swallowed by design — see processSale's comment above.
    }

    return {
      action: SALE_COMMAND_ACTION.CANCEL_SALE,
      data: { saleId },
      refreshPaths: SALES_REVALIDATE_PATHS,
    };
  }

  static makeActor(
    userId: number,
    role: UserRole,
    source: ProductCommandSource = PRODUCT_COMMAND_SOURCE.MANUAL
  ): SalesCommandActor {
    return { userId, role, source };
  }

  private assertCanSell(role: UserRole): void {
    if (!SALES_AUTHORIZED_ROLES.includes(role)) {
      throw new UnauthorizedError(`El rol '${role}' no tiene permisos para gestionar ventas`);
    }
  }
}
