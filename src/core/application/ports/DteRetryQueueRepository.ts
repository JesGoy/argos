import type { DteDocument } from '@/core/domain/entities/DteDocument';

/**
 * Deliberately NOT org-scoped, unlike every other DTE port: the retry worker
 * is a system-level cron job that must see every organization's stuck
 * documents in one query. Every other repository stays tenant-isolated.
 */
export interface DteRetryQueueRepository {
  /** Documents in a non-terminal state where a new attempt can make progress. */
  findRetryable(): Promise<DteDocument[]>;
}
