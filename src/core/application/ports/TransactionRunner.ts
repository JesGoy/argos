/**
 * Transaction Runner Port
 *
 * Runs a unit of work atomically. The `tx` handle passed to the callback is
 * opaque to the application layer — its concrete type belongs to infra — and is
 * forwarded straight into repository write methods so they enlist in the same
 * transaction. If the work throws, the transaction is rolled back.
 */
export interface TransactionRunner {
  run<T>(work: (tx: unknown) => Promise<T>): Promise<T>;
}
