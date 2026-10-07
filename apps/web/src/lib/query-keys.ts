/**
 * Query key factory helper.
 * Provides a uniform shape of keys per scope for use with TanStack Query.
 */

export function createKeyFactory<TParams = void>(scope: string) {
  return {
    all: () => [scope] as const,
    lists: () => [scope, 'list'] as const,
    list: (params?: TParams) => [scope, 'list', params] as const,
    details: () => [scope, 'detail'] as const,
    detail: (id: string | number) => [scope, 'detail', id] as const
  };
}

export type QueryKeyFactory<TParams = void> = ReturnType<typeof createKeyFactory<TParams>>;
