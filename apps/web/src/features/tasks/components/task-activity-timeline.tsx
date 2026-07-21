'use client';

import { formatDateVN } from "@/lib/date";
import { Icons } from '@/components/icons';
import { commonUiCopy, taskUiCopy } from '@/lib/app-copy';
import { useTaskActivitiesQuery } from '../queries/task-queries';
import { TASK_STATUS_MAP } from '../utils/task-status';

interface TaskActivity {
  id: string;
  taskId: string;
  actorUserId?: string | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; username: string; email?: string | null } | null;
}

const ACTION_LABELS: Record<string, string> = {
  created: taskUiCopy.timeline.created,
  assigned: taskUiCopy.timeline.assigned,
  accepted: taskUiCopy.timeline.accepted,
  declined: taskUiCopy.timeline.declined,
  submitted: taskUiCopy.timeline.submitted,
  approved: taskUiCopy.timeline.approved,
  returned: taskUiCopy.timeline.returned,
  resubmitted: taskUiCopy.timeline.resubmitted,
  status_changed: taskUiCopy.timeline.statusChanged,
  progress_updated: taskUiCopy.timeline.progressUpdated
};

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return taskUiCopy.timeline.justNow;
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return formatDateVN(date);
}

interface TaskActivityTimelineProps {
  taskId: string;
}

export function TaskActivityTimeline({ taskId }: TaskActivityTimelineProps) {
  const activitiesQuery = useTaskActivitiesQuery(taskId);
  const activities = (activitiesQuery.data ?? []) as TaskActivity[];

  if (activitiesQuery.isLoading) {
    return (
      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
        <Icons.spinner className='h-4 w-4 animate-spin' />
        {commonUiCopy.loading}
      </div>
    );
  }

  if (activities.length === 0) {
    return <div className='text-muted-foreground text-sm'>{taskUiCopy.timeline.empty}</div>;
  }

  return (
    <div>
      <h3 className='mb-3 text-sm font-medium'>{taskUiCopy.timeline.title(activities.length)}</h3>
      <div className='relative space-y-0'>
        {activities.map((activity, idx) => {
          const isLast = idx === activities.length - 1;
          const statusLabel = activity.toStatus
            ? (TASK_STATUS_MAP as Record<string, { label: string }>)[activity.toStatus]?.label ?? activity.toStatus
            : null;

          return (
            <div key={activity.id} className='relative flex gap-3 pb-4'>
              <div className='flex flex-col items-center'>
                <div className='bg-primary/20 flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
                  <div className='bg-primary h-2 w-2 rounded-full' />
                </div>
                {!isLast && <div className='bg-border w-px flex-1' />}
              </div>
              <div className='min-w-0 flex-1 pt-0.5'>
                <div className='flex items-baseline justify-between gap-2'>
                  <span className='text-sm font-medium'>
                    {ACTION_LABELS[activity.action] ?? activity.action}
                  </span>
                  <span className='text-muted-foreground shrink-0 text-[10px]'>
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>
                <div className='text-muted-foreground text-xs'>
                  {activity.actor?.username ?? taskUiCopy.timeline.systemActor}
                  {statusLabel && (
                    <span>
                      {' → '}
                      <span className='font-medium'>{statusLabel}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
