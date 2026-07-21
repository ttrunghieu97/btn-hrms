export const TIMELINE_EVENTS = {
  SYSTEM: 'system' as const,
  STATUS: 'status' as const,
  CONTRACT: 'contract' as const,
  POSITION: 'position' as const,
} as const;

export type TimelineType =
  | typeof TIMELINE_EVENTS.SYSTEM
  | typeof TIMELINE_EVENTS.STATUS
  | typeof TIMELINE_EVENTS.CONTRACT
  | typeof TIMELINE_EVENTS.POSITION;

export type TimelineSystemEvent = 'employee_created';
export type TimelineStatusEvent = 'status_changed';
export type TimelineContractEvent =
  | 'contract_created'
  | 'contract_renewed'
  | 'contract_amended'
  | 'contract_ended'
  | 'contract_expired';
export type TimelinePositionEvent =
  | 'assignment_created'
  | 'position_changed';

export type TimelineEventKey =
  | TimelineSystemEvent
  | TimelineStatusEvent
  | TimelineContractEvent
  | TimelinePositionEvent;

export interface TimelineEvent {
  id: string;
  type: TimelineType;
  event: TimelineEventKey;
  occurredAt: Date;
  actorName: string | null;
  metadataVersion: 1;
  metadata: Record<string, unknown>;
}

export const TIMELINE_SORT = {
  occurredAt: 'desc' as const,
  tieBreakerType: 'asc' as const,
  tieBreakerId: 'asc' as const,
} as const;

export type TimelineQueryParams = {
  employeeId: string;
  types?: TimelineType[];
  limit?: number;
};
