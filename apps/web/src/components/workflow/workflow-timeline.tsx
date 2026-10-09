'use client';

import * as React from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { formatDateTimeVN } from '@/lib/date';

export interface WorkflowTimelineEvent {
  id: string;
  title: string;
  actor?: string;
  timestamp?: string;
  description?: string;
  status?: string;
  icon?: React.ReactNode;
}

export interface WorkflowTimelineProps {
  events: WorkflowTimelineEvent[];
  emptyMessage?: string;
  className?: string;
}

export function WorkflowTimeline({
  events,
  emptyMessage = 'Chưa có lịch sử xử lý quy trình.',
  className,
}: WorkflowTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn('p-4 text-center text-xs text-muted-foreground border rounded-lg', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border', className)}>
      {events.map((event) => (
        <div key={event.id} className='relative group'>
          {/* Timeline node dot */}
          <div className='absolute -left-6 top-1 flex size-4 items-center justify-center rounded-full bg-background border-2 border-primary'>
            <div className='size-1.5 rounded-full bg-primary' />
          </div>

          <div className='rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1 text-xs transition-colors hover:border-primary/40'>
            <div className='flex items-center justify-between gap-2'>
              <span className='font-semibold text-foreground'>{event.title}</span>
              {event.timestamp && (
                <span className='text-[10px] text-muted-foreground whitespace-nowrap'>
                  {formatDateTimeVN(event.timestamp)}
                </span>
              )}
            </div>

            {event.actor && (
              <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                <Icons.user className='size-3 text-primary shrink-0' />
                <span>Thực hiện bởi: <strong className='text-foreground'>{event.actor}</strong></span>
              </div>
            )}

            {event.description && (
              <p className='text-[11px] text-muted-foreground italic rounded bg-background/60 p-1.5 mt-1'>
                &ldquo;{event.description}&rdquo;
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
