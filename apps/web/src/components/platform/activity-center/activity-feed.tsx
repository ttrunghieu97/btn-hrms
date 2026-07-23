'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityTimeline } from '@/components/platform/activity-timeline';
import { ActivityEngine, getActivityEngine } from './activity-engine';
import { approvalActivityProvider, notificationActivityProvider } from './providers';
import type { ActivityItem, ActivityType } from './types';
import type { TimelineItem, TimelineItemStatus } from '@/components/platform/activity-timeline';

interface ActivityCenterFeedProps {
  /** Max items to show */
  limit?: number;
  /** Filter to specific types */
  types?: ActivityType[];
  /** Show filter tabs */
  showFilters?: boolean;
}

const typeConfig: Record<ActivityType, { label: string; icon: string }> = {
  approval: { label: 'Approvals', icon: '✓' },
  employee: { label: 'Employees', icon: '👤' },
  attendance: { label: 'Attendance', icon: '⏰' },
  payroll: { label: 'Payroll', icon: '💰' },
  document: { label: 'Documents', icon: '📄' },
  security: { label: 'Security', icon: '🔒' },
  system: { label: 'System', icon: '⚙' },
  notification: { label: 'Notifications', icon: '🔔' },
};

const severityToStatus: Record<string, TimelineItemStatus> = {
  info: 'completed',
  warning: 'pending',
  critical: 'rejected',
};

function activityToTimelineItem(item: ActivityItem): TimelineItem {
  return {
    id: item.id,
    type: item.type === 'approval' ? 'approval' as const : item.type === 'security' ? 'comment' as const : 'system' as const,
    title: item.title,
    description: item.description,
    status: severityToStatus[item.severity] ?? 'completed',
    timestamp: item.timestamp,
    actor: item.actor ? { id: item.actor.id, name: item.actor.name } : undefined,
    metadata: item.entity ? [
      { label: item.entity.type, value: item.entity.id },
    ] : undefined,
  };
}

function groupByDate(items: TimelineItem[]): Map<string, TimelineItem[]> {
  const groups = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const date = new Date(item.timestamp).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const existing = groups.get(date) ?? [];
    existing.push(item);
    groups.set(date, existing);
  }
  return groups;
}

export function ActivityCenterFeed({ limit = 50, types, showFilters = true }: ActivityCenterFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ActivityType | 'all'>('all');

  const engine = useMemo(() => {
    const e = getActivityEngine();
    e.register(approvalActivityProvider);
    e.register(notificationActivityProvider);
    return e;
  }, []);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = types ? { limit, types } : { limit };
      const items = await engine.getActivities(q);
      setActivities(items);
    } finally {
      setIsLoading(false);
    }
  }, [engine, limit, types]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return activities;
    return activities.filter((a) => a.type === activeFilter);
  }, [activities, activeFilter]);

  const timelineItems = useMemo(() => filtered.map(activityToTimelineItem), [filtered]);
  const groupedByDate = useMemo(() => groupByDate(timelineItems), [timelineItems]);
  const groupedEntries = useMemo(() => Array.from(groupedByDate.entries()), [groupedByDate]);

  // Deduplicate filter types present in data
  const availableTypes = useMemo(() => {
    const types = new Set(activities.map((a) => a.type));
    return Array.from(types);
  }, [activities]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && availableTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {typeConfig[type]?.icon} {typeConfig[type]?.label ?? type}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity grouped by date */}
      {!isLoading && groupedEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        </div>
      )}

      {!isLoading && groupedEntries.map(([dateLabel, items]) => (
        <div key={dateLabel} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
            {dateLabel}
          </p>
          <ActivityTimeline items={items} />
        </div>
      ))}
    </div>
  );
}
