/**
 * Structured logger for server-side use. Outputs JSON to stdout/stderr so
 * platform log aggregators (Vercel, Datadog, Loki) can parse fields directly.
 *
 * Why structured: grep-ing strings does not scale once we have multi-tenant
 * traffic and an AI loop that emits multiple events per turn. JSON lets us
 * filter by organizationId, level, or component.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  organizationId?: number;
  userId?: number | string;
  component?: string;
  [key: string]: unknown;
}

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  context?: LogContext;
  error?: { name: string; message: string; stack?: string };
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')) as LogLevel;
  return LEVEL_RANK[envLevel] ? envLevel : 'info';
}

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === 'error' || entry.level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

function log(level: LogLevel, msg: string, context?: LogContext, error?: unknown) {
  if (LEVEL_RANK[level] < LEVEL_RANK[minLevel()]) return;
  const entry: LogEntry = { ts: new Date().toISOString(), level, msg };
  if (context && Object.keys(context).length > 0) entry.context = context;
  if (error instanceof Error) {
    entry.error = { name: error.name, message: error.message, stack: error.stack };
  } else if (error !== undefined) {
    entry.error = { name: 'NonErrorThrow', message: String(error) };
  }
  emit(entry);
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => log('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext, err?: unknown) => log('warn', msg, ctx, err),
  error: (msg: string, ctx?: LogContext, err?: unknown) => log('error', msg, ctx, err),
};
