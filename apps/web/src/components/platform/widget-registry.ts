/**
 * Dashboard widget contract.
 *
 * Features register widgets here. The dashboard engine reads the registry
 * and composes role-based dashboards based on user permissions.
 *
 * ```ts
 * // In features/attendance/widgets/checkin-widget.ts
 * import { registerWidget } from '@/components/platform';
 *
 * registerWidget({
 *   id: 'attendance-checkin',
 *   title: 'Today Check-in',
 *   permissions: ['attendance:view'],
 *   component: CheckinWidget,
 * });
 * ```
 */

import type { ComponentType } from 'react';

export interface DashboardWidget {
  /** Unique widget ID (kebab-case, domain-prefixed) */
  id: string;
  /** Human-readable title */
  title: string;
  /** Description shown in dashboard edit mode */
  description?: string;
  /** User must have at least one of these permissions to see the widget */
  permissions?: string[];
  /** Roles that can see this widget (empty = all) */
  roles?: string[];
  /** Default width (1-4 columns) */
  defaultWidth?: 1 | 2 | 3 | 4;
  /** Default height in rows */
  defaultHeight?: 1 | 2;
  /** The component to render */
  component: ComponentType<unknown>;
}

export type DashboardWidgetRegistry = Map<string, DashboardWidget>;

let registry: DashboardWidgetRegistry | null = null;

function getRegistry(): DashboardWidgetRegistry {
  if (!registry) {
    registry = new Map();
  }
  return registry;
}

/**
 * Register a widget. Called at module import time by feature modules.
 */
export function registerWidget(widget: DashboardWidget): void {
  const reg = getRegistry();
  if (reg.has(widget.id)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[widget-registry] Duplicate widget ID: ${widget.id}`);
    }
    return;
  }
  reg.set(widget.id, widget);
}

/**
 * Get all registered widgets, optionally filtered by permissions and roles.
 */
export function getWidgets(options?: {
  permissions?: string[];
  roles?: string[];
}): DashboardWidget[] {
  const reg = getRegistry();
  const all = Array.from(reg.values());

  if (!options) return all;

  return all.filter((w) => {
    if (w.permissions && w.permissions.length > 0) {
      const hasPermission = options.permissions?.some((p) => w.permissions!.includes(p));
      if (!hasPermission) return false;
    }
    if (w.roles && w.roles.length > 0) {
      const hasRole = options.roles?.some((r) => w.roles!.includes(r));
      if (!hasRole) return false;
    }
    return true;
  });
}

/**
 * Create a new widget registry (for testing or multi-tenant setups).
 */
export function createWidgetRegistry(): DashboardWidgetRegistry {
  return new Map();
}
