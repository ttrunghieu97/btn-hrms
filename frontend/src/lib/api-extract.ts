/**
 * Envelope helpers for orval response shape.
 *
 * orval customFetch returns `{ data: Envelope, status, headers }` where
 * Envelope = `{ data: T | T[], meta?: { ... }, error: null }`.
 *
 * These helpers unwrap both the orval wrapper AND the BE envelope,
 * so callers don't need to know the nesting depth.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext?: boolean;
}

export interface ListEnvelope<T> {
  data: T[];
  meta?: { pagination?: PaginationMeta; total?: number };
}

export interface SingleEnvelope<T> {
  data: T;
}

type AnyRecord = Record<string, unknown>;

function resolveEnvelope(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  const r = input as AnyRecord;
  // orval wrapper: { data: Envelope, status: number, headers: Headers }
  if (typeof r['status'] === 'number' && 'headers' in r && 'data' in r) {
    return r['data'];
  }
  return input;
}

export function extractList<T>(input: unknown): T[] {
  const envelope = resolveEnvelope(input);
  if (Array.isArray(envelope)) return envelope as T[];
  const root = envelope as AnyRecord | null | undefined;
  if (root && Array.isArray(root['data'])) return root['data'] as T[];
  return [];
}

export function extractPagination(input: unknown): PaginationMeta | undefined {
  const envelope = resolveEnvelope(input) as AnyRecord | null | undefined;
  if (!envelope) return undefined;
  const meta = envelope['meta'] as { pagination?: PaginationMeta; total?: number } | undefined;
  if (!meta) return undefined;
  if (meta.pagination) return meta.pagination;
  if (typeof meta.total === 'number') {
    return { page: 1, limit: meta.total, total: meta.total };
  }
  return undefined;
}

export function unwrapData<T>(input: unknown): T {
  const envelope = resolveEnvelope(input) as AnyRecord | null | undefined;
  if (envelope && 'data' in envelope && envelope['data'] !== undefined) {
    return envelope['data'] as T;
  }
  return input as T;
}
