import { useMutation, useQuery, type QueryClient } from '@tanstack/react-query';
import {
  tasksControllerListNotifications,
  tasksControllerMarkAllNotificationsRead,
  tasksControllerMarkNotificationRead
} from '@/api/generated/endpoints';
import { extractList } from '@/lib/api-extract';
import type { NotificationAction, NotificationStatus } from '@/components/ui/notification-card';
import { createKeyFactory } from '@/lib/query-keys';
import { queryPolicyPresets } from '@/lib/query-client';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: NotificationStatus;
  createdAt: string;
  actions?: NotificationAction[];
};

export const notificationKeys = createKeyFactory('notifications');

export function useNotificationsQuery() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: ({ signal }) => tasksControllerListNotifications({ signal }),
    select: (data) => extractList<NotificationItem>(data),
    ...queryPolicyPresets['fast-changing']
  });
}

export function useMarkNotificationReadMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: (id: string) => tasksControllerMarkNotificationRead(id),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    }
  });
}

export function useMarkAllNotificationsReadMutation(queryClient: QueryClient) {
  return useMutation({
    mutationFn: () => tasksControllerMarkAllNotificationsRead(),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    }
  });
}
