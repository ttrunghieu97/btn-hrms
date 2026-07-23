import type { ActivityProvider, ActivityItem, ActivityQuery, ActivityType } from './types';

export class ActivityEngine {
  private providers: Map<string, ActivityProvider> = new Map();

  register(provider: ActivityProvider): void {
    if (this.providers.has(provider.id)) return;
    this.providers.set(provider.id, provider);
  }

  async getActivities(query: ActivityQuery = {}): Promise<ActivityItem[]> {
    const activeProviders = Array.from(this.providers.values());

    const results = await Promise.all(
      activeProviders.map((p) => p.getActivities(query)),
    );

    // Merge + sort by timestamp descending
    const merged = results.flat();
    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (query.types && query.types.length > 0) {
      return merged.filter((item) => query.types!.includes(item.type));
    }

    return merged.slice(0, query.limit ?? 50);
  }
}

let globalEngine: ActivityEngine | null = null;

export function getActivityEngine(): ActivityEngine {
  if (!globalEngine) {
    globalEngine = new ActivityEngine();
  }
  return globalEngine;
}
