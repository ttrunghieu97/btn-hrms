'use client';

import { useMemo } from 'react';
import { WidgetDashboard } from './widget-dashboard';
import { ROLE_TO_LAYOUT, type DashboardLayoutId } from '../dashboard-layouts';

interface RoleDashboardProps {
  /** Override the layout derived from role */
  layoutId?: DashboardLayoutId;
  /** User roles from auth context */
  roles?: string[];
}

/**
 * Role-aware dashboard shell.
 *
 * Resolves the correct dashboard layout from the user's roles.
 * Falls back to 'employee' if no role matches.
 *
 * Usage:
 * ```tsx
 * // Auto-detect from auth
 * <RoleDashboard roles={currentUser.roles} />
 *
 * // Explicit override
 * <RoleDashboard layoutId="executive" />
 * ```
 */
export function RoleDashboard({ layoutId, roles }: RoleDashboardProps) {
  const resolvedLayout = useMemo<DashboardLayoutId>(() => {
    if (layoutId) return layoutId;
    if (!roles || roles.length === 0) return 'operations';

    // Match in priority order (first match wins)
    for (const role of roles) {
      const mapped = ROLE_TO_LAYOUT[role.toLowerCase()];
      if (mapped) return mapped;
    }
    return 'operations';
  }, [layoutId, roles]);

  return <WidgetDashboard layoutId={resolvedLayout} />;
}
