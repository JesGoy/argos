import type {
  DteProvider,
  IssueBoletaInput,
  IssueCreditNoteInput,
  DteIssueResult,
} from '@/core/application/ports/DteProvider';

/**
 * No-network DteProvider. Not selectable via DteConfig (Openfactura's free
 * sandbox already covers "safe to use everywhere pre-launch") — this exists
 * purely so use-case tests and offline local dev can exercise the outbox,
 * retry and cancellation flows without any credentials or network access.
 */
export class StubDteProvider implements DteProvider {
  private nextFolio = 1;

  async issueBoleta(_input: IssueBoletaInput, idempotencyKey: string): Promise<DteIssueResult> {
    return this.fakeResult(idempotencyKey);
  }

  async issueCreditNote(_input: IssueCreditNoteInput, idempotencyKey: string): Promise<DteIssueResult> {
    return this.fakeResult(idempotencyKey);
  }

  private fakeResult(idempotencyKey: string): DteIssueResult {
    return {
      folio: this.nextFolio++,
      token: `stub-token-${idempotencyKey}`,
      pdfBase64: '',
      xmlBase64: '',
      rawResponse: { stub: true },
    };
  }
}
