'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDateVN } from '@/lib/date';
import type { TimelineItem, TimelineItemStatus } from './types';

const statusConfig: Record<TimelineItemStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
  skipped: { label: 'Skipped', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500' },
};

export interface TimelineItemComponentProps {
  item: TimelineItem;
  isLast?: boolean;
}

export function TimelineItemComponent({ item, isLast }: TimelineItemComponentProps) {
  const status = statusConfig[item.status];
  const initials = item.actor?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??';

  return (
    <div className="relative flex gap-4 pb-8">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 h-full w-px bg-border" />
      )}

      {/* Status dot */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
          item.status === 'completed' && 'border-green-500 bg-green-50 dark:bg-green-950',
          item.status === 'pending' && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
          item.status === 'rejected' && 'border-red-500 bg-red-50 dark:bg-red-950',
          item.status === 'cancelled' && 'border-gray-400 bg-gray-50 dark:bg-gray-800',
        )}>
          {item.type === 'approval' && <CheckIcon className="h-5 w-5" />}
          {item.type === 'comment' && <MessageIcon className="h-5 w-5" />}
          {item.type === 'system' && <ClockIcon className="h-5 w-5" />}
          {item.type === 'status_change' && <ArrowIcon className="h-5 w-5" />}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 pt-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{item.title}</span>
          <Badge variant="outline" className={cn('text-xs font-normal', status.className)}>
            {status.label}
          </Badge>
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}

        <div className="flex items-center gap-3 mt-1">
          {item.actor && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={item.actor.avatar ?? undefined} />
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{item.actor.name}</span>
              {item.actor.role && (
                <span className="text-xs text-muted-foreground/60">{item.actor.role}</span>
              )}
            </div>
          )}
          <span className="text-xs text-muted-foreground/60">
            {formatDateVN(item.timestamp)}
          </span>
        </div>

        {item.metadata && item.metadata.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {item.metadata.map((m, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                {m.label}: {m.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline icons (small, commonly used)
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}
function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}
