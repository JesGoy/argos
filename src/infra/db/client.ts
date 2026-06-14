import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Neon serverless WebSocket pool driver. Unlike the HTTP driver it supports
// interactive transactions (db.transaction), which ProcessSale/CancelSale need
// to write a sale + its items + stock movements + customer debt atomically.
// On Node 22+ (local and Vercel) the global WebSocket is used automatically,
// so no `ws` package is required.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export function getDb() {
  return db;
}

/**
 * A Drizzle executor: either the root db or a transaction handle yielded by
 * db.transaction(). Repository write methods accept one so they can enlist in
 * an ongoing transaction; callers outside a transaction omit it and get `db`.
 */
export type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];
