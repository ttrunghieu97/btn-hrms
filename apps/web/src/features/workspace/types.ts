import type { ComponentType } from 'react';

/** Aggregate action from any domain, shown in Pending Actions widget. */
export interface WorkspaceAction {
  id: string;
  title: string;
  description?: string;
  type: 'approval' | 'task' | 'notification' | 'document';
  url: string;
  createdAt: string | Date;
  priority?: 'high' | 'medium' | 'low';
}

/** Workspace today summary (server or aggregated client-side). */
export interface TodaySummary {
  attendance?: {
    status: 'checked_in' | 'checked_out' | 'not_checked';
    time?: string;
    session?: 'morning' | 'noon' | 'afternoon';
  };
  leaveBalance?: {
    annual: { used: number; total: number };
    sick: { used: number; total: number };
  };
  pendingActionsCount: number;
  notificationsCount: number;
}

/** Quick action link, permission-gated. */
export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon?: React.ReactNode;
  permission?: string;
}

export type WorkspaceRole = 'employee' | 'manager' | 'hr' | 'admin';
