export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationCategory = 'approval' | 'task' | 'leave' | 'payroll' | 'system' | 'document';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category?: NotificationCategory;
  read: boolean;
  createdAt: string;
  action?: {
    label: string;
    href: string;
  };
  metadata?: Record<string, unknown>;
}

export interface NotificationBadge {
  count: number;
  urgentCount: number;
}
