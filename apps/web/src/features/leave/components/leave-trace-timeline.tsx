'use client';

import * as React from 'react';
import { useLeaveTraceControllerTrace } from '@/api/generated/leave-trace/leave-trace';
import { unwrapData } from '@/lib/api-extract';
import { Icons } from '@/components/icons';
import { formatDateVN } from '@/lib/date';
import { cn } from '@/lib/utils';

interface TraceEvent {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  source: 'leave' | 'engine' | 'integration';
  actor: string | null;
  detail: string | null;
  raw?: Record<string, unknown> | null;
}

interface LeaveTraceData {
  leaveId: string;
  timeline: TraceEvent[];
  correlation?: {
    approvalRequestId: string | null;
  };
}

interface LeaveTraceTimelineProps {
  leaveRequestId: string;
}

export function LeaveTraceTimeline({ leaveRequestId }: LeaveTraceTimelineProps) {
  const { data, isLoading, error } = useLeaveTraceControllerTrace(leaveRequestId, {
    query: {
      enabled: Boolean(leaveRequestId),
    },
  });

  const trace = unwrapData<LeaveTraceData | null>(data);
  const timeline = trace?.timeline ?? [];

  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-6 text-xs text-muted-foreground'>
        <Icons.spinner className='mr-2 size-4 animate-spin' />
        Đang tải lịch sử sự kiện...
      </div>
    );
  }

  if (error || !timeline.length) {
    return (
      <div className='rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground'>
        Chưa có sự kiện phê duyệt hoặc lịch sử được ghi nhận cho đơn này.
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Lịch sử luồng sự kiện (Audit Trace)
        </h4>
        {trace?.correlation?.approvalRequestId && (
          <span className='text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded'>
            Mã yêu cầu duyệt: {trace.correlation.approvalRequestId.slice(0, 8)}...
          </span>
        )}
      </div>

      <div className='relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border'>
        {timeline.map((event, index) => {
          const isLatest = index === timeline.length - 1;
          const isApprove = event.type.includes('approved') || event.label.toLowerCase().includes('duyệt');
          const isReject = event.type.includes('rejected') || event.label.toLowerCase().includes('từ chối');
          const isCancel = event.type.includes('cancel') || event.label.toLowerCase().includes('hủy');

          return (
            <div key={event.id || `${event.type}-${index}`} className='relative text-xs'>
              {/* Timeline marker icon */}
              <div
                className={cn(
                  'absolute -left-6 top-0.5 flex size-5 items-center justify-center rounded-full border bg-background text-[10px]',
                  isApprove && 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950',
                  isReject && 'border-destructive bg-destructive/10 text-destructive',
                  isCancel && 'border-muted-foreground bg-muted text-muted-foreground',
                  !isApprove && !isReject && !isCancel && (isLatest ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')
                )}
              >
                {isApprove && <Icons.check className='size-3' />}
                {isReject && <Icons.close className='size-3' />}
                {isCancel && <Icons.userOff className='size-3' />}
                {!isApprove && !isReject && !isCancel && <div className='size-1.5 rounded-full bg-current' />}
              </div>

              {/* Event content box */}
              <div className='rounded-lg border border-border/60 bg-card p-3 shadow-xs'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='font-semibold text-foreground'>{event.label || event.type}</span>
                  <span className='text-[10px] text-muted-foreground'>
                    {event.timestamp ? formatDateVN(event.timestamp) : '—'}
                  </span>
                </div>

                <div className='mt-1 flex items-center gap-2 text-[11px] text-muted-foreground'>
                  <span>Thực hiện:</span>
                  <span className='font-medium text-foreground'>
                    {event.actor || (event.source === 'engine' ? 'Hệ thống tự động' : 'Người dùng')}
                  </span>
                  <span className='rounded bg-muted px-1.5 py-0.2 text-[10px] capitalize'>
                    {event.source}
                  </span>
                </div>

                {event.detail && (
                  <p className='mt-1.5 rounded bg-muted/40 p-2 text-[11px] text-muted-foreground italic'>
                    {event.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
