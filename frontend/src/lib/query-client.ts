/**
 * Query policies + cache subscriber.
 * Ported from legacy shared/lib/query-client.ts with refactor:
 * - Use ApiError instead of axios isAxiosError
 * - SSR-safe (browserQueryClient pattern preserved)
 */

import {
  QueryCache,
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
  keepPreviousData
} from '@tanstack/react-query';
import { isProdAppEnv } from './app-env';
import { ApiError } from './api-error';
import { resolveAppError } from './error-taxonomy';
import { feedbackCopy } from './feedback-copy';
import { notifyMutationError, notifyQueryError } from './mutation-feedback';

export type QueryPolicyPreset =
  | 'default'
  | 'dashboard'
  | 'employees'
  | 'static'
  | 'fast-changing'
  | 'monitoring';

interface QueryPolicy {
  staleTime: number;
  gcTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
  placeholderData: typeof keepPreviousData;
  retry: (failureCount: number, error: unknown) => boolean;
  retryDelay: (attemptIndex: number) => number;
}

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (!isProdAppEnv) return false;
  if (failureCount >= 3) return false;
  return resolveAppError(error).retryable;
}

function getRetryDelayMs(attemptIndex: number): number {
  const base = 600;
  const jitter = Math.floor(Math.random() * 300);
  return Math.min(base * 2 ** attemptIndex + jitter, 8_000);
}

const sharedPolicy: Pick<QueryPolicy, 'placeholderData' | 'retry' | 'retryDelay'> = {
  placeholderData: keepPreviousData,
  retry: shouldRetryQuery,
  retryDelay: getRetryDelayMs
};

export const queryPolicyPresets: Record<QueryPolicyPreset, QueryPolicy> = {
  default: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: isProdAppEnv,
    refetchOnReconnect: true,
    ...sharedPolicy
  },
  dashboard: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...sharedPolicy
  },
  employees: {
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...sharedPolicy
  },
  static: {
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    ...sharedPolicy
  },
  'fast-changing': {
    staleTime: 10_000,
    gcTime: 3 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...sharedPolicy
  },
  monitoring: {
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...sharedPolicy
  }
};

// Merges query policy preset into options without breaking TQ v5 overload inference.
// The outer cast to `any` then back to `T` is intentional: `T & QueryPolicy` breaks
// TQ v5's generic overload resolution because TQueryKey becomes undecidable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withQueryPolicy<T>(options: T, preset: QueryPolicyPreset = 'default'): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ...queryPolicyPresets[preset], ...(options as any) } as T;
}

function makeQueryClient(): QueryClient {
  const queryCache = new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.toastShown) return;
        if (resolveAppError(error).kind === 'service-unavailable') {
          notifyQueryError(error, feedbackCopy.failure.systemUnavailable);
        }
      }
    }
  });

  return new QueryClient({
    defaultOptions: {
      queries: {
        ...queryPolicyPresets.default
      },
      mutations: {
        onError: (error) => {
          if (error instanceof ApiError && !error.toastShown) {
            const resolved = resolveAppError(error);
            if (resolved.kind !== 'unauthenticated' && resolved.kind !== 'forbidden') {
              notifyMutationError(error, feedbackCopy.failure.processRequest);
            }
          }
        }
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending'
      }
    },
    queryCache
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
