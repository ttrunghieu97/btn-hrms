import type { SearchProvider, SearchResult, SearchGroup } from './types';

/**
 * Search engine — aggregates all registered providers and executes search.
 *
 * Usage:
 * ```ts
 * const engine = createSearchEngine();
 * engine.register(employeeSearchProvider);
 * const results = await engine.search('Nguyen');
 * ```
 */
export class SearchEngine {
  private providers: Map<string, SearchProvider> = new Map();

  register(provider: SearchProvider): void {
    if (this.providers.has(provider.id)) return;
    this.providers.set(provider.id, provider);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  async search(query: string, options?: {
    /** Filter to specific provider IDs */
    providers?: string[];
  }): Promise<SearchGroup[]> {
    if (!query || query.trim().length < 1) return [];

    const q = query.trim();
    const activeProviders = options?.providers
      ? options.providers.map((id) => this.providers.get(id)).filter(Boolean) as SearchProvider[]
      : Array.from(this.providers.values());

    const results = await Promise.all(
      activeProviders.map(async (provider) => {
        const items = await provider.search(q);
        return { label: provider.label, results: items } satisfies SearchGroup;
      }),
    );

    return results.filter((group) => group.results.length > 0);
  }
}

/** Singleton search engine instance */
let globalEngine: SearchEngine | null = null;

export function getSearchEngine(): SearchEngine {
  if (!globalEngine) {
    globalEngine = new SearchEngine();
  }
  return globalEngine;
}

export function resetSearchEngine(): void {
  globalEngine = null;
}
