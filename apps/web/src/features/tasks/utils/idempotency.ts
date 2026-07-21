/**
 * Idempotency-Key header builder.
 * Ported from `buildIdempotencyHeaders` in legacy `features/tasks/api/task-api.ts`.
 *
 * Designed to be passed via the orval RequestInit `headers` option for any
 * mutation that should be safely retried (accept / reject / submit / approve
 * / return / transition).
 */

import { getRequestId } from '@/lib/request-id';

export interface IdempotencyHeader {
  'Idempotency-Key': string;
}

export function buildIdempotencyKey(): string {
  return getRequestId();
}

export function buildIdempotencyHeaders(): IdempotencyHeader {
  return { 'Idempotency-Key': buildIdempotencyKey() };
}
