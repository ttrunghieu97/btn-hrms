'use client';

import { useMemo, useState } from 'react';
import { ActivityTimeline } from '@/components/platform/activity-timeline';
import type { TimelineItem, TimelineItemStatus } from '@/components/platform/activity-timeline';
import type { AuditEvent } from '../types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface AuditTimelineViewProps {
  events: AuditEvent[];
  isLoading?: boolean;
}

const severityToStatus: Record<string, TimelineItemStatus> = {
  critical: 'rejected',
  warning: 'pending',
  info: 'completed',
};

function auditToTimeline(event: AuditEvent): TimelineItem {
  return {
    id: event.id,
    type: 'comment' as const,
    title: event.action.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    description: event.resource
      ? `${event.resource.type}: ${event.resource.label ?? event.resource.id}`
      : undefined,
    status: severityToStatus[event.severity] ?? 'completed',
    timestamp: event.timestamp,
    actor: event.actor ? { id: event.actor.id, name: event.actor.name } : undefined,
    metadata: [
      ...(event.requestId ? [{ label: 'Request ID', value: event.requestId.slice(0, 8) + '…' }] : []),
      ...(event.target ? [{ label: 'Target', value: event.target }] : []),
    ],
  };
}

export function AuditTimelineView({ events, isLoading }: AuditTimelineViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const timelineItems = useMemo(() => events.map(auditToTimeline), [events]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">No audit events found.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="cursor-pointer"
        onClick={() => {
          // Open detail sheet on timeline item click
          // Since ActivityTimeline doesn't support click natively,
          // we use inline clickable wrapper
        }}
      >
        <ActivityTimeline items={timelineItems} />
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedEvent && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">
                  {selectedEvent.action.replace(/\./g, ' ')}
                </SheetTitle>
                <SheetDescription>
                  Audit event detail
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  <Section label="Actor">
                    <p className="text-sm">{selectedEvent.actor?.name ?? 'System'}</p>
                    <p className="text-xs text-muted-foreground">ID: {selectedEvent.actor?.id ?? 'N/A'}</p>
                  </Section>

                  <Section label="Action">
                    <Badge variant="outline">{selectedEvent.action}</Badge>
                  </Section>

                  {selectedEvent.resource && (
                    <Section label="Resource">
                      <p className="text-sm">{selectedEvent.resource.type}: {selectedEvent.resource.label ?? selectedEvent.resource.id}</p>
                    </Section>
                  )}

                  <Section label="Timestamp">
                    <p className="text-sm">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
                  </Section>

                  {selectedEvent.requestId && (
                    <Section label="Request ID">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{selectedEvent.requestId}</code>
                    </Section>
                  )}

                  {selectedEvent.traceId && (
                    <Section label="Trace ID">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{selectedEvent.traceId}</code>
                    </Section>
                  )}

                  {selectedEvent.before && Object.keys(selectedEvent.before).length > 0 && (
                    <Section label="Before">
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                        {JSON.stringify(selectedEvent.before, null, 2)}
                      </pre>
                    </Section>
                  )}

                  {selectedEvent.after && Object.keys(selectedEvent.after).length > 0 && (
                    <Section label="After">
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                        {JSON.stringify(selectedEvent.after, null, 2)}
                      </pre>
                    </Section>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );
}
