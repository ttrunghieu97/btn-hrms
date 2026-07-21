import { Injectable } from '@nestjs/common';
import { TimelineAggregator } from '../aggregators/timeline.aggregator';
import { TimelineEventDto } from '../dto/timeline-event.dto';
import type { TimelineType } from '../types/timeline-types';

const VALID_TYPES: TimelineType[] = ['system', 'status', 'contract', 'position'];

export interface ListTimelineInput {
  employeeId: string;
  types?: string; // comma-separated
  limit?: number;
}

@Injectable()
export class ListEmployeeTimelineUseCase {
  constructor(
    private readonly aggregator: TimelineAggregator,
  ) {}

  async execute(input: ListTimelineInput): Promise<TimelineEventDto[]> {
    const types = this.parseTypes(input.types);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);

    const events = await this.aggregator.execute({
      employeeId: input.employeeId,
      types,
      limit,
    });

    return events.map((ev) => ({
      id: ev.id,
      type: ev.type,
      event: ev.event,
      occurredAt: ev.occurredAt,
      actorName: ev.actorName,
      metadataVersion: ev.metadataVersion,
      metadata: ev.metadata,
    }));
  }

  private parseTypes(raw?: string): TimelineType[] | undefined {
    if (!raw) return undefined;
    const parts = raw.split(',').map((t) => t.trim().toLowerCase()) as TimelineType[];
    const valid = parts.filter((t) => VALID_TYPES.includes(t));
    return valid.length > 0 ? valid : undefined;
  }
}
