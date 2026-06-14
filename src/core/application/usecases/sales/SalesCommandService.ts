import type { ProcessSale, ProcessSaleInput, ProcessSaleResult } from '@/core/application/usecases/sales/ProcessSale';
import type { CancelSale } from '@/core/application/usecases/sales/CancelSale';
import {
  SALE_COMMAND_ACTION,
  type SaleCommandAction,
} from '@/core/domain/constants/SaleConstants';
import { PRODUCT_COMMAND_SOURCE, type ProductCommandSource } from '@/core/domain/constants/ProductConstants';
import { SALES_AUTHORIZED_ROLES, type UserRole } from '@/core/domain/constants/UserConstants';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { SALES_REVALIDATE_PATHS } from '@/config/routes';

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
    }
  ) {}

  async processSale(
    actor: SalesCommandActor,
    input: Omit<ProcessSaleInput, 'userId'>
  ): Promise<SalesCommandResult<ProcessSaleResult>> {
    this.assertCanSell(actor.role);

    const data = await this.deps.processSale.execute({ ...input, userId: actor.userId });

    return {
      action: SALE_COMMAND_ACTION.PROCESS_SALE,
      data,
      refreshPaths: SALES_REVALIDATE_PATHS,
    };
  }

  async cancelSale(
    actor: SalesCommandActor,
    saleId: string
  ): Promise<SalesCommandResult<{ saleId: string }>> {
    this.assertCanSell(actor.role);

    await this.deps.cancelSale.execute(saleId, actor.userId);

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
