'use client';

import { useMemo } from 'react';
import type { TodaySummary, WorkspaceAction, WorkspaceRole } from '../types';

/**
 * Workspace data hook.
 *
 * Aggregates TanStack Query hooks from individual features.
 * Each feature owns its query — workspace only composes.
 *
 * Replace this with a single backend query when:
 * 1. Workspace load time becomes a problem (>3s)
 * 2. Multiple features need workspace-level aggregation
 */
export function useWorkspaceData() {
  // Phase 1: placeholder — returns empty data.
  // When backend queries are ready, import and call them here:
  //
  //   const attendance = useMyAttendanceTodayQuery();
  //   const leaveBal = useMyLeaveBalanceQuery();
  //   const pendingApprovals = useApprovalInboxQuery();
  //   const notifications = useMyNotificationsQuery();
  //
  // TanStack Query handles deduplication, caching, and parallel fetching.

  const summary: TodaySummary = useMemo(() => ({
    attendance: undefined,
    leaveBalance: undefined,
    pendingActionsCount: 0,
    notificationsCount: 0,
  }), []);

  const actions: WorkspaceAction[] = useMemo(() => [], []);

  const isLoading = false;
  const error = null;

  return { summary, actions, isLoading, error };
}

export function useWorkspaceRole(): WorkspaceRole {
  // Derive from auth store once integrated.
  // For now, default to 'employee'.
  return 'employee';
}
