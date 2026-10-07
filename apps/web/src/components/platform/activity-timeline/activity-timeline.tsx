'use client';

import { TimelineItemComponent } from './timeline-item';
import type { TimelineItem } from './types';

export type { TimelineItem, TimelineItemStatus } from './types';

export interface ActivityTimelineProps {
  items: TimelineItem[];
  className?: string;
  emptyMessage?: string;
}

/**
 * Platform-level activity timeline.
 *
 * Usage:
 * ```tsx
 * <ActivityTimeline items={approvalHistory} />
 * ```
 *
 * Supports all domain types (approval, leave, expense, recruitment, payroll, asset)
 * through a unified `TimelineItem` interface.
 */
export function ActivityTimeline({
  items,
  className,
  emptyMessage = 'No activity recorded yet.',
}: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <TimelineItemComponent
          key={item.id}
          item={item}
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  );
}
