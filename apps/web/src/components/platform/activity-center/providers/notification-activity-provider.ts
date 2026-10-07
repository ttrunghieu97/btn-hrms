import type { ActivityProvider, ActivityItem } from '../types';

/**
 * Notification activity provider — maps recent notifications to ActivityItems.
 * Phase 1: mock. Phase 2: fetch from notification API.
 */
const mockNotificationActivities: ActivityItem[] = [
  { id: 'na-1', type: 'notification', title: 'Profile update reminder', description: 'Complete your profile — missing emergency contact', timestamp: new Date(Date.now() - 1800000).toISOString(), severity: 'info' },
  { id: 'na-2', type: 'system', title: 'Payroll processed', description: 'June 2025 payroll has been processed', timestamp: new Date(Date.now() - 43200000).toISOString(), severity: 'info', actor: { id: 'u-4', name: 'Payroll System' } },
  { id: 'na-3', type: 'security', title: 'New device login', description: 'Chrome on Windows — Ho Chi Minh City', timestamp: new Date(Date.now() - 172800000).toISOString(), severity: 'warning' },
];

export const notificationActivityProvider: ActivityProvider = {
  id: 'notifications',
  label: 'Notifications',
  getActivities: async () => mockNotificationActivities,
};
