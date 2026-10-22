import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import {
  platformNotificationsControllerGetMyNotifications,
  platformNotificationsControllerMarkAllNotificationsRead,
  platformNotificationsControllerMarkNotificationRead
} from '@/api/generated/platform-notifications/platform-notifications';
import { extractList } from '@/lib/api-extract';
import type { NotificationAction, NotificationStatus } from '@/components/ui/notification-card';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';
import { useCanRunAuthenticatedQuery } from '@/stores/auth-store';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: NotificationStatus;
  createdAt: string;
  actions?: NotificationAction[];
};

type RawPlatformNotification = {
  id: string;
  subject?: string | null;
  title?: string | null;
  body?: string | null;
  status?: string;
  isRead?: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actions?: NotificationAction[];
};

export function mapPlatformNotificationToItem(raw: RawPlatformNotification): NotificationItem {
  const metaIsRead =
    raw.metadata && typeof raw.metadata === 'object' ? raw.metadata.isRead === true : false;
  const isRead = raw.isRead === true || raw.status === 'read' || metaIsRead;
  const status: NotificationStatus =
    raw.status === 'archived' ? 'archived' : isRead ? 'read' : 'unread';

  return {
    id: raw.id,
    title: raw.subject || raw.title || 'Thông báo hệ thống',
    body: raw.body || '',
    status,
    createdAt: raw.createdAt,
    ...(raw.actions ? { actions: raw.actions } : {})
  };
}

export const notificationKeys = createKeyFactory('notifications');

export function useNotificationsQuery() {
  const canRun = useCanRunAuthenticatedQuery();

  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ signal }) => platformNotificationsControllerGetMyNotifications({ signal }),
    select: (data) => extractList<RawPlatformNotification>(data).map(mapPlatformNotificationToItem),
    ...queryPolicyPresets['fast-changing'],
    enabled: canRun
  });
}

export function useMarkNotificationReadMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (id: string) => platformNotificationsControllerMarkNotificationRead(id),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.detail('count') });
    }
  });
}

export function useMarkAllNotificationsReadMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: () => platformNotificationsControllerMarkAllNotificationsRead(),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.detail('count') });
    }
  });
}

export function useNotificationsCountQuery() {
  const canRun = useCanRunAuthenticatedQuery();

  return useQuery({
    queryKey: notificationKeys.detail('count'),
    queryFn: ({ signal }) => platformNotificationsControllerGetMyNotifications({ signal }),
    select: (data) => {
      const items = extractList<RawPlatformNotification>(data).map(mapPlatformNotificationToItem);
      return {
        count: items.filter((n) => n.status === 'unread').length,
        urgentCount: 0,
      };
    },
    ...queryPolicyPresets['fast-changing'],
    enabled: canRun,
  });
}
