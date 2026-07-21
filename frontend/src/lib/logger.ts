/**
 * Structured logger.
 *
 * Dev: human-readable console output with level prefix.
 * Prod: JSON lines (timestamp + level + message + meta) for log aggregators.
 *
 * Error level always writes regardless of environment.
 */

import { isDevAppEnv } from '@/lib/app-env';

const isDev = isDevAppEnv;

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogMeta = Record<string, unknown>;

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  // Error always writes — the only sink when no remote error service
  if (level === 'error') {
    if (isDev) {
      console.error(message, meta ?? '');
    } else {
      console.error(JSON.stringify({ level, message, meta, timestamp: new Date().toISOString() }));
    }
    return;
  }

  if (level === 'warn') {
    if (isDev) {
      console.warn(message, meta ?? '');
    } else {
      console.warn(JSON.stringify({ level, message, meta, timestamp: new Date().toISOString() }));
    }
    return;
  }

  // info / debug — dev only
  if (!isDev) return;
  if (level === 'debug') {
    console.warn(message, meta ?? '');
  } else {
    console.warn(message, meta ?? '');
  }
}

export const appLogger = {
  info(message: string, meta?: LogMeta) {
    write('info', message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    write('warn', message, meta);
  },
  error(message: string, meta?: LogMeta) {
    write('error', message, meta);
  },
  debug(message: string, meta?: LogMeta) {
    write('debug', message, meta);
  },
};
