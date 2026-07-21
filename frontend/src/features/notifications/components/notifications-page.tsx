'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { NotificationCard } from '@/components/ui/notification-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notificationActionRoutes, notificationUiCopy } from '@/locales/vi/notifications';
import { getQueryClient } from '@/lib/query-client';
import { useRouter } from 'next/navigation';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  type NotificationItem
} from '../queries/notification-queries';

export default function NotificationsPage() {
  const queryClient = getQueryClient();
  const { data: notifications = [] } = useNotificationsQuery();
  const markAsReadMutation = useMarkNotificationReadMutation(queryClient);
  const markAllAsReadMutation = useMarkAllNotificationsReadMutation(queryClient);
  const router = useRouter();
  const count = notifications.filter((notification) => notification.status === 'unread').length;
  const markAsRead = (id: string) => markAsReadMutation.mutate(id);
  const markAllAsRead = () => markAllAsReadMutation.mutate();

  const unreadNotifications = notifications.filter((n) => n.status === 'unread');
  const readNotifications = notifications.filter((n) => n.status === 'read');

  const renderList = (items: NotificationItem[]) => {
    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>{notificationUiCopy.emptyList}</p>
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2'>
        {items.map((notification) => (
          <NotificationCard
            key={notification.id}
            id={notification.id}
            title={notification.title}
            body={notification.body}
            status={notification.status}
            createdAt={notification.createdAt}
            actions={notification.actions}
            onMarkAsRead={markAsRead}
            onAction={(notifId, actionId) => {
              const route = notificationActionRoutes[actionId];
              if (route) {
                markAsRead(notifId);
                router.push(route);
              }
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className='flex flex-1 flex-col min-h-0'>
      {count > 0 && (
        <div className='mb-4 flex items-start justify-between'>
          <Button variant='outline' size='sm' onClick={markAllAsRead}>
            {notificationUiCopy.markAllAsRead}
          </Button>
        </div>
      )}
      <Tabs defaultValue='all' className='flex flex-1 flex-col min-h-0'>
        <TabsList>
          <TabsTrigger value='all'>{notificationUiCopy.tabs.all(notifications.length)}</TabsTrigger>
          <TabsTrigger value='unread'>
            {notificationUiCopy.tabs.unread(unreadNotifications.length)}
          </TabsTrigger>
          <TabsTrigger value='read'>{notificationUiCopy.tabs.read(readNotifications.length)}</TabsTrigger>
        </TabsList>
        <TabsContent value='all' className='mt-4 flex-1 min-h-0'>
          {renderList(notifications)}
        </TabsContent>
        <TabsContent value='unread' className='mt-4 flex-1 min-h-0'>
          {renderList(unreadNotifications)}
        </TabsContent>
        <TabsContent value='read' className='mt-4 flex-1 min-h-0'>
          {renderList(readNotifications)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
