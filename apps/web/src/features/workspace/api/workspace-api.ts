import type { TodaySummary } from '../types';

/**
 * Workspace data adapter.
 *
 * Aggregates data from existing feature API calls without creating
 * a dedicated BFF. Each method returns data compatible with the
 * workspace's TodaySummary model.
 *
 * When backend aggregation is justified, replace this adapter
 * with a single /workspace endpoint — not before.
 */
export const workspaceApi = {
  async getTodaySummary(): Promise<TodaySummary> {
    // Phase 1: client-side aggregation from existing feature queries.
    // The actual data fetching is done via TanStack Query hooks
    // in features/workspace/queries/ — this adapter exists for
    // future backend migration.
    //
    // Current implementation fetches per-feature in parallel hooks.
    // See: queries/use-workspace-data.ts
    return {
      attendance: undefined,
      leaveBalance: undefined,
      pendingActionsCount: 0,
      notificationsCount: 0,
    };
  },
};
