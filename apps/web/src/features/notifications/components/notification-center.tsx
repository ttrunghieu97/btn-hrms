'use client';

import { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { getQueryClient } from '@/lib/query-client';
import { NotificationBadge } from './notification-badge';
import { NotificationFilters, type NotificationFilter } from './notification-filters';
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useNotificationsCountQuery,
  type NotificationItem,
} from '../queries/notification-queries';
import { notificationUiCopy } from '@/locales/vi/notifications';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationItemRow({
  notification,
  onMarkRead,
  onAction,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
  onAction: (id: string) => void;
}) {
  const isUnread = notification.status === 'unread';

  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
        isUnread ? 'border-l-2 border-l-primary bg-muted/20' : ''
      }`}
    >
      {/* Unread indicator */}
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
        isUnread ? 'bg-primary' : 'bg-transparent'
      }`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm ${isUnread ? 'font-medium' : ''}`}>{notification.title}</p>
            {notification.body && (
              <p className="text-xs text-muted-foreground mt-0.5">{notification.body}</p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onMarkRead(notification.id)}
          >
            Mark read
          </Button>
        )}
        {notification.actions?.[0] && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onAction(notification.id)}
          >
            {notification.actions[0].label} →
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const queryClient = getQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = (searchParams.get('filter') as NotificationFilter) ?? 'all';

  const { data: notifications = [] } = useNotificationsQuery();
  const { data: counts } = useNotificationsCountQuery();
  const markAsReadMutation = useMarkNotificationReadMutation(queryClient);
  const markAllAsReadMutation = useMarkAllNotificationsReadMutation(queryClient);

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => n.status === 'unread');
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.status === 'unread').length,
    [notifications],
  );

  const handleMarkRead = useCallback(
    (id: string) => markAsReadMutation.mutate(id),
    [markAsReadMutation],
  );

  const handleMarkAllRead = useCallback(
    () => markAllAsReadMutation.mutate(),
    [markAllAsReadMutation],
  );

  const handleAction = useCallback(
    (notifId: string) => {
      handleMarkRead(notifId);
      router.push('/notifications');
    },
    [handleMarkRead, router],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stay updated on approvals, tasks, and system events
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBadge count={counts?.count ?? 0} urgent={(counts?.urgentCount ?? 0) > 0} />
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              {notificationUiCopy.markAllAsRead}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <NotificationFilters total={notifications.length} unreadCount={unreadCount} />

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Icons.notification className="text-muted-foreground/40 mb-3 h-12 w-12" />
          <p className="text-sm text-muted-foreground">
            {filter === 'unread' ? 'No unread notifications' : notificationUiCopy.emptyList}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification) => (
            <NotificationItemRow
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
