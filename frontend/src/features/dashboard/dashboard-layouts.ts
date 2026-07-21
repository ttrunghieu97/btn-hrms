import type { DashboardWidgetId } from './widget-registry/widget-ids';

export type DashboardLayoutId = 'executive' | 'operations';

export interface DashboardLayout {
  id: DashboardLayoutId;
  widgets: DashboardWidgetId[];
}

export const DASHBOARD_LAYOUTS: Record<DashboardLayoutId, DashboardLayout> = {
  executive: {
    id: 'executive',
    widgets: [
      'headcount',
      'employee-status',
      'department-headcount',
      'hires-vs-leavers',
      'payroll-cost-trend',
    ],
  },
  operations: {
    id: 'operations',
    widgets: [
      'attendance-today',
      'attendance-exceptions',
      'pending-leave-requests',
      'pending-approvals',
    ],
  },
};
