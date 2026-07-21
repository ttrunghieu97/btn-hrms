'use client';

import { cn } from '@/lib/utils';
import { formatDateVN } from "@/lib/date";
import { getDeadlineInfo } from '../utils/deadline-progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { taskUiCopy } from '@/locales/vi/app-copy';

interface DeadlineBarProps {
  createdAt: string | null | undefined;
  dueDate: string | null | undefined;
  completedAt?: string | null | undefined;
}

function fmt(d: string) {
  return formatDateVN(d);
}

export function DeadlineBar({ createdAt, dueDate, completedAt }: DeadlineBarProps) {
  const info = getDeadlineInfo(createdAt, dueDate, completedAt);

  // If no due date or creation date is set, show a placeholder instead of returning null.
  // This helps the user see where the component lives and understand why the bar is not active.
  if (!info || !createdAt || !dueDate) {
    return (
      <div className="space-y-2 rounded-xl border border-muted/55 bg-muted/20 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
          <span className="uppercase tracking-wider">{taskUiCopy.deadlineBar.header}</span>
          <Badge variant="outline" className="px-2 py-0.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950/30 text-zinc-500 border-none shadow-none">
            {taskUiCopy.deadlineBar.notSet}
          </Badge>
        </div>
        <div className="text-[11px] text-muted-foreground/75 italic">
          {taskUiCopy.deadlineBar.placeholder}
        </div>
      </div>
    );
  }

  const pct = Math.round(Math.min(info.ratio * 100, 100));
  const isOverdue = info.ratio > 1;
  const isCompleted = !!completedAt;

  // Dot position along the timeline (clamped between 0 and 100)
  const dotPosition = `${Math.min(Math.max(info.ratio * 100, 0), 100)}%`;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 rounded-xl border border-muted/55 bg-muted/20 p-4">
        {/* Top Info Header */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {taskUiCopy.deadlineBar.header}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'px-2.5 py-0.5 text-xs font-semibold border-none shadow-none',
              info.badgeBgColor,
              info.badgeTextColor
            )}
          >
            {info.remainingLabel}
          </Badge>
        </div>

        {/* Timeline Visualizer */}
        <div className="relative pt-1 pb-4">
          <div className="relative flex items-center h-2">
            {/* Timeline Line */}
            <div className="absolute inset-x-0 h-1.5 rounded-full bg-muted/60 dark:bg-muted-foreground/20 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', info.barBgColor)}
                style={{ width: `${isOverdue ? 100 : pct}%` }}
              />
            </div>

            {/* Start point */}
            <div className="absolute left-0 size-2.5 -translate-x-1/2 rounded-full border border-background bg-muted-foreground/60" />

            {/* Current status indicator pin */}
            <div
              className="absolute size-3.5 -translate-x-1/2 rounded-full border-2 border-background bg-background shadow-md transition-all z-10 flex items-center justify-center cursor-pointer"
              style={{ left: dotPosition }}
            >
              <span className={cn('size-2 rounded-full', info.dotColor)} />
            </div>

            {/* End point */}
            <div className="absolute right-0 size-2.5 translate-x-1/2 rounded-full border border-background bg-muted-foreground/60" />
          </div>

          {/* Timeline Date Labels */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>{createdAt ? fmt(createdAt) : '—'}</span>
            <span>{dueDate ? fmt(dueDate) : '—'}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
