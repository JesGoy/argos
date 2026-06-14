import type { TransactionRunner } from '@/core/application/ports/TransactionRunner';
import { getDb } from '@/infra/db/client';

/**
 * Drizzle implementation of TransactionRunner backed by the Neon serverless
 * (WebSocket) driver, which supports interactive transactions.
 */
export class TransactionRunnerDrizzle implements TransactionRunner {
  run<T>(work: (tx: unknown) => Promise<T>): Promise<T> {
    return getDb().transaction((tx) => work(tx));
  }
}
