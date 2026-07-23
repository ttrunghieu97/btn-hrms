'use client';

import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  /** Show pulsing dot for urgent */
  urgent?: boolean;
  className?: string;
}

/**
 * Notification badge — unread count indicator.
 * Use in header, sidebar nav, and workspace.
 */
export function NotificationBadge({ count, urgent, className }: NotificationBadgeProps) {
  if (count === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none',
        urgent
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-primary text-primary-foreground',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
