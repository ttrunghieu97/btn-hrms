import { customFetch } from '@/lib/fetcher';
import { unwrapData } from '@/lib/api-extract';

/** Event types returned by the timeline API */
export type TimelineEventType = 'system' | 'status' | 'contract' | 'position';

/** Event keys per type */
export type TimelineSystemEvent = 'employee_created';
export type TimelineStatusEvent = 'status_changed';
export type TimelineContractEvent =
  | 'contract_created'
  | 'contract_renewed'
  | 'contract_amended'
  | 'contract_ended'
  | 'contract_expired';
export type TimelinePositionEvent = 'assignment_created' | 'position_changed';

export type TimelineEventKey =
  | TimelineSystemEvent
  | TimelineStatusEvent
  | TimelineContractEvent
  | TimelinePositionEvent;

/** A single timeline event from the API */
export interface TimelineEventDto {
  id: string;
  type: TimelineEventType;
  event: TimelineEventKey;
  occurredAt: string;
  actorName: string | null;
  metadataVersion: number;
  metadata: Record<string, unknown>;
}

/** Params for GET /api/v1/employees/:id/timeline */
export interface TimelineQueryParams {
  types?: string; // comma-separated event types
  limit?: number; // max events to return (default 20, max 50)
}

/** GET /api/v1/employees/:id/timeline */
export async function fetchEmployeeTimeline(
  employeeId: string,
  params?: TimelineQueryParams,
): Promise<TimelineEventDto[]> {
  const searchParams = new URLSearchParams();
  if (params?.types) searchParams.set('types', params.types);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();

  const response = await customFetch<TimelineEventDto[]>(
    `/api/v1/employees/${employeeId}/timeline${qs ? `?${qs}` : ''}`,
  );
  return unwrapData(response);
}
