import { platformNotificationsControllerGetMyNotifications } from '@/api/generated/platform-notifications/platform-notifications';
import { extractList } from '@/lib/api-extract';
import type { ActivityProvider, ActivityItem } from '../types';

type RawPlatformNotification = {
  id: string;
  subject?: string | null;
  body?: string | null;
  status?: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * Notification activity provider — maps recent notifications from platform-notifications API to ActivityItems.
 */
export const notificationActivityProvider: ActivityProvider = {
  id: 'notifications',
  label: 'Notifications',
  getActivities: async (): Promise<ActivityItem[]> => {
    try {
      const response = await platformNotificationsControllerGetMyNotifications();
      const items = extractList<RawPlatformNotification>(response);
      return items.map((n) => ({
        id: n.id,
        type: 'notification',
        title: n.subject || 'Thông báo hệ thống',
        ...(n.body ? { description: n.body } : {}),
        timestamp: n.createdAt,
        severity: n.status === 'failed' ? 'critical' : 'info',
      }));
    } catch {
      return [];
    }
  },
};
